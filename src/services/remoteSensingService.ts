import { getSupabaseClient } from "../lib/supabase"

export const remoteSensingProducts = ["NDVI", "NDWI / Water Index", "Land Use / Land Cover", "Change Detection"] as const
export type RemoteSensingProduct = (typeof remoteSensingProducts)[number]

export interface SatelliteObservationRecord {
  id: string
  code: string
  statistic: string | null
  value: number | null
  unit: string | null
  observedAt: string
  rasterReference: string | null
  status: string
  recordType: "Scene observation" | "Derived indicator"
}

export interface SatelliteSceneRecord {
  id: string
  sceneIdentifier: string
  watershedId: string
  watershedCode: string
  watershedName: string
  sourceId: string | null
  sourceName: string
  sourceOrganization: string | null
  sourceLicense: string | null
  platform: string | null
  sensor: string | null
  acquiredAt: string
  resolutionM: number | null
  cloudCoverage: number | null
  observationStart: string | null
  observationEnd: string | null
  rasterReference: string | null
  status: string
  metadata: Record<string, unknown>
  observations: SatelliteObservationRecord[]
}

export interface AssociatedChangeRecord {
  id: string
  watershedId: string
  status: string
  observedChange: number | null
  summary: string | null
  createdAt: string
}

export interface RemoteSensingDirectory {
  scenes: SatelliteSceneRecord[]
  changes: AssociatedChangeRecord[]
  watersheds: Array<{ id: string; code: string; name: string }>
}

interface RawScene {
  id: string
  scene_identifier: string
  watershed_id: string
  data_source_id: string | null
  platform: string | null
  sensor: string | null
  acquired_at: string
  resolution_m: number | string | null
  cloud_cover_percent: number | string | null
  observation_start: string | null
  observation_end: string | null
  asset_path: string | null
  status: string
  metadata: Record<string, unknown> | null
}

export async function loadRemoteSensingDirectory(): Promise<RemoteSensingDirectory> {
  const client = getSupabaseClient()
  const [scenesResult, watershedsResult, sourcesResult, observationsResult, indicatorsResult, changesResult] = await Promise.all([
    client.from("satellite_scenes").select("id, scene_identifier, watershed_id, data_source_id, platform, sensor, acquired_at, resolution_m, cloud_cover_percent, observation_start, observation_end, asset_path, status, metadata").order("acquired_at", { ascending: false }).limit(1000),
    client.from("watersheds").select("id, code, name").order("name").limit(1000),
    client.from("data_sources").select("id, name, organization, license"),
    client.from("satellite_observations").select("id, watershed_id, satellite_scene_id, observation_code, statistic, value, unit, observed_at, raster_asset_path, status").order("observed_at", { ascending: false }).limit(5000),
    client.from("indicators").select("id, watershed_id, source_observation_id, indicator_code, name, observed_at, value, unit, status").order("observed_at", { ascending: false }).limit(5000),
    client.from("change_analysis").select("id, watershed_id, status, observed_change, summary, created_at").order("created_at", { ascending: false }).limit(3000),
  ])
  if (scenesResult.error) throw new Error("Satellite scenes could not be loaded. Check the scene metadata migration and watershed access permissions.")
  if (watershedsResult.error) throw new Error("Watershed names could not be loaded. Check the database migration and access permissions.")
  if (sourcesResult.error) throw new Error("Data source provenance could not be loaded. Check data-source permissions.")
  if (observationsResult.error) throw new Error("Satellite observations could not be loaded. Check the observation schema and access permissions.")
  if (indicatorsResult.error) throw new Error("Derived watershed indicators could not be loaded. Check the indicator schema and access permissions.")
  if (changesResult.error) throw new Error("Change-analysis records could not be loaded. Check the analysis schema and access permissions.")

  const watersheds = (watershedsResult.data ?? []).map((row) => ({ id: String(row.id), code: String(row.code), name: String(row.name) }))
  const watershedById = new Map(watersheds.map((item) => [item.id, item]))
  const sources = new Map((sourcesResult.data ?? []).map((row) => [String(row.id), row]))
  const observationsByScene = new Map<string, SatelliteObservationRecord[]>()
  for (const row of observationsResult.data ?? []) {
    if (row.status !== "AVAILABLE") continue
    const sceneId = String(row.satellite_scene_id)
    const numericValue = row.value === null ? null : Number(row.value)
    const observation: SatelliteObservationRecord = {
      id: String(row.id),
      code: String(row.observation_code),
      statistic: typeof row.statistic === "string" ? row.statistic : null,
      value: numericValue !== null && Number.isFinite(numericValue) ? numericValue : null,
      unit: typeof row.unit === "string" ? row.unit : null,
      observedAt: String(row.observed_at),
      rasterReference: typeof row.raster_asset_path === "string" ? row.raster_asset_path : null,
      status: String(row.status),
      recordType: "Scene observation",
    }
    observationsByScene.set(sceneId, [...(observationsByScene.get(sceneId) ?? []), observation])
  }
  const sceneByObservationId = new Map<string, string>()
  for (const row of observationsResult.data ?? []) {
    if (row.status === "AVAILABLE") sceneByObservationId.set(String(row.id), String(row.satellite_scene_id))
  }
  for (const row of indicatorsResult.data ?? []) {
    if (!row.source_observation_id || row.status === "REJECTED" || row.status === "ARCHIVED") continue
    const sceneId = sceneByObservationId.get(String(row.source_observation_id))
    if (!sceneId) continue
    const numericValue = row.value === null ? null : Number(row.value)
    const indicator: SatelliteObservationRecord = {
      id: String(row.id),
      code: String(row.indicator_code || row.name),
      statistic: String(row.name),
      value: numericValue !== null && Number.isFinite(numericValue) ? numericValue : null,
      unit: typeof row.unit === "string" ? row.unit : null,
      observedAt: String(row.observed_at),
      rasterReference: null,
      status: String(row.status),
      recordType: "Derived indicator",
    }
    observationsByScene.set(sceneId, [...(observationsByScene.get(sceneId) ?? []), indicator])
  }

  const scenes = ((scenesResult.data ?? []) as unknown as RawScene[]).map((scene): SatelliteSceneRecord => {
    const watershed = watershedById.get(scene.watershed_id)
    const source = scene.data_source_id ? sources.get(scene.data_source_id) : undefined
    const metadata = scene.metadata ?? {}
    const resolution = scene.resolution_m === null ? null : Number(scene.resolution_m)
    const cloudCoverage = scene.cloud_cover_percent === null ? null : Number(scene.cloud_cover_percent)
    return {
      id: scene.id,
      sceneIdentifier: scene.scene_identifier,
      watershedId: scene.watershed_id,
      watershedCode: watershed?.code ?? "—",
      watershedName: watershed?.name ?? "Watershed unavailable",
      sourceId: scene.data_source_id,
      sourceName: source?.name ?? "Source not linked",
      sourceOrganization: typeof source?.organization === "string" ? source.organization : null,
      sourceLicense: typeof source?.license === "string" ? source.license : null,
      platform: scene.platform,
      sensor: scene.sensor,
      acquiredAt: scene.acquired_at,
      resolutionM: resolution !== null && Number.isFinite(resolution) ? resolution : null,
      cloudCoverage: cloudCoverage !== null && Number.isFinite(cloudCoverage) ? cloudCoverage : null,
      observationStart: scene.observation_start,
      observationEnd: scene.observation_end,
      rasterReference: scene.asset_path,
      status: scene.status,
      metadata,
      observations: observationsByScene.get(scene.id) ?? [],
    }
  })

  const changes = (changesResult.data ?? []).map((row): AssociatedChangeRecord => ({
    id: String(row.id),
    watershedId: String(row.watershed_id),
    status: String(row.status),
    observedChange: row.observed_change === null ? null : Number(row.observed_change),
    summary: typeof row.summary === "string" ? row.summary : null,
    createdAt: String(row.created_at),
  }))
  return { scenes, changes, watersheds }
}

export function classifyRemoteSensingProduct(code: string): RemoteSensingProduct | null {
  const normalized = code.toUpperCase().replaceAll(/[^A-Z0-9]/g, "")
  if (normalized.includes("NDVI") || normalized.includes("VEGETATIONINDEX")) return "NDVI"
  if (normalized.includes("NDWI") || normalized.includes("WATERINDEX") || normalized.includes("MNDWI")) return "NDWI / Water Index"
  if (normalized.includes("LULC") || normalized.includes("LANDUSE") || normalized.includes("LANDCOVER")) return "Land Use / Land Cover"
  if (normalized.includes("CHANGE") || normalized.includes("DIFFERENCE")) return "Change Detection"
  return null
}
