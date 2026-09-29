import type { MapFeatureCollection } from "../maps"
import { getSupabaseClient } from "../lib/supabase"
import { loadAnalyticsWorkspace, type AnalyticsWorkspace } from "./analyticsService"
import { loadEvidenceDirectory, type EvidenceDirectory } from "./evidenceService"
import { loadInterventionDirectory, type InterventionDirectory } from "./interventionService"
import { loadRealMapFeatures } from "./mapApiService"

export interface ExplorerWatershed {
  id: string
  code: string
  name: string
  stateId: string | null
  state: string | null
  districtId: string | null
  district: string | null
  areaSqKm: number | null
  status: string
  villageCount: number
  lastUpdated: string | null
}

export interface WatershedExplorerWorkspace {
  watersheds: ExplorerWatershed[]
  features: MapFeatureCollection
  evidence: EvidenceDirectory
  interventions: InterventionDirectory
  analytics: AnalyticsWorkspace
}

function parseFeatureCollection(value: unknown): MapFeatureCollection {
  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>
    if (object.type === "FeatureCollection" && Array.isArray(object.features)) return value as MapFeatureCollection
  }
  return { type: "FeatureCollection", features: [] }
}

export async function loadWatershedExplorerWorkspace(): Promise<WatershedExplorerWorkspace> {
  const client = getSupabaseClient()
  const [analytics, evidence, interventions, watershedRows, villageRows, featureRows] = await Promise.all([
    loadAnalyticsWorkspace(),
    loadEvidenceDirectory(),
    loadInterventionDirectory(),
    client.from("watersheds").select("id, code, name, area_sq_km, status, updated_at").order("name").limit(2000),
    client.from("watershed_villages").select("watershed_id, village_id").limit(20000),
    loadRealMapFeatures(),
  ])
  if (watershedRows.error || villageRows.error) throw new Error("Watershed details could not be loaded in the current data scope.")

  const counts = new Map<string, number>()
  for (const row of villageRows.data ?? []) counts.set(String(row.watershed_id), (counts.get(String(row.watershed_id)) ?? 0) + 1)
  const areasByWatershed = new Map<string, (typeof analytics.areas)[number]>()
  for (const area of analytics.areas) if (!areasByWatershed.has(area.watershedId)) areasByWatershed.set(area.watershedId, area)
  const metadataById = new Map((watershedRows.data ?? []).map((row) => [String(row.id), row]))
  const watersheds = analytics.watersheds.flatMap((watershed): ExplorerWatershed[] => {
    const metadata = metadataById.get(watershed.id)
    if (!metadata) return []
    const area = areasByWatershed.get(watershed.id)
    return [{
      ...watershed,
      stateId: area?.stateId ?? null,
      state: area?.stateName ?? null,
      districtId: area?.districtId ?? null,
      district: area?.districtName ?? null,
      areaSqKm: metadata.area_sq_km === null ? null : Number(metadata.area_sq_km),
      status: String(metadata.status),
      villageCount: counts.get(watershed.id) ?? 0,
      lastUpdated: typeof metadata.updated_at === "string" ? metadata.updated_at : null,
    }]
  })
  return { watersheds, features: parseFeatureCollection(featureRows), evidence, interventions, analytics }
}
