import type { MapFeatureCollection } from "../maps"
import { getSupabaseClient } from "../lib/supabase"
import { loadAnalyticsWorkspace, type AnalyticsWorkspace } from "./analyticsService"
import { loadEvidenceDirectory, type EvidenceDirectory } from "./evidenceService"
import { loadInterventionDirectory, type InterventionDirectory } from "./interventionService"
import { fetchWatershedExplorerFeatureCollection } from "./watershedApiService"

export interface ExplorerWatershed {
  id: string
  code: string
  name: string
  stateId: string | null
  state: string | null
  districtId: string | null
  district: string | null
  blockId: string | null
  block: string | null
  villageId: string | null
  village: string | null
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

export async function loadWatershedExplorerWorkspace(): Promise<WatershedExplorerWorkspace> {
  const client = getSupabaseClient()
  if (!client) {
    throw new Error("Supabase is not configured.")
  }

  const [analytics, evidence, interventions, watershedRows, villageRows, explorerFeatures] = await Promise.all([
    loadAnalyticsWorkspace(),
    loadEvidenceDirectory(),
    loadInterventionDirectory(),
    client
      .from("watersheds")
      .select("id, code, watershed_code, name, watershed_name, district_id, village_id, area_km2, area_sq_km, status, updated_at, metadata")
      .order("name")
      .limit(2000),
    client.from("watershed_villages").select("watershed_id, village_id").limit(20000),
    fetchWatershedExplorerFeatureCollection(),
  ])

  if (watershedRows.error) {
    throw new Error("Watershed details could not be loaded in the current data scope.")
  }

  const counts = new Map<string, number>()
  for (const row of villageRows.data ?? []) {
    counts.set(String(row.watershed_id), (counts.get(String(row.watershed_id)) ?? 0) + 1)
  }

  const areasByWatershed = new Map<string, (typeof analytics.areas)[number]>()
  for (const area of analytics.areas) {
    if (!areasByWatershed.has(area.watershedId)) {
      areasByWatershed.set(area.watershedId, area)
    }
  }

  const watersheds: ExplorerWatershed[] = (watershedRows.data ?? []).map((row: any) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>
    const area = areasByWatershed.get(row.id)
    const areaVal = row.area_km2 ?? row.area_sq_km ?? meta.area_km2
    return {
      id: String(row.id),
      code: String(row.watershed_code ?? row.code ?? ""),
      name: String(row.watershed_name ?? row.name ?? ""),
      stateId: area?.stateId ?? null,
      state: area?.stateName ?? (meta.state ? String(meta.state) : null),
      districtId: row.district_id ? String(row.district_id) : (area?.districtId ?? null),
      district: area?.districtName ?? (meta.district ? String(meta.district) : null),
      blockId: null,
      block: meta.block ? String(meta.block) : null,
      villageId: row.village_id ? String(row.village_id) : null,
      village: meta.village ? String(meta.village) : null,
      areaSqKm: areaVal === null || areaVal === undefined ? null : Number(areaVal),
      status: String(row.status ?? "ACTIVE"),
      villageCount: counts.get(row.id) ?? Number(meta.villages_count ?? 1),
      lastUpdated: typeof row.updated_at === "string" ? row.updated_at : null,
    }
  })

  return {
    watersheds,
    features: explorerFeatures,
    evidence,
    interventions,
    analytics,
  }
}
