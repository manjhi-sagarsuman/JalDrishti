import type { MapFeatureCollection } from "../maps"
import { getSupabaseClient } from "../lib/supabase"
import type { RemoteSensingProduct } from "./remoteSensingService"
import { classifyRemoteSensingProduct } from "./remoteSensingService"

export type AnalyticsType = RemoteSensingProduct

export interface AnalyticsIndicator {
  id: string
  watershedId: string
  code: string
  name: string
  observedAt: string
  value: number
  unit: string
  status: string
  dataSourceId: string | null
  sourceObservationId: string | null
  sourceSceneId: string | null
  methodology: Record<string, unknown>
}

export interface AnalyticsComparison {
  id: string
  watershedId: string
  status: string
  observedChange: number | null
  summary: string | null
  createdAt: string
  updatedAt: string | null
  createdBy: string | null
  baselineIndicatorId: string
  comparisonIndicatorId: string
  resultMetadata: Record<string, unknown>
  analysisMetadata: Record<string, unknown>
  affectedAreaHa: number | null
}

export interface AnalyticsMethodSource {
  id: string
  name: string
  organization: string | null
  license: string | null
}

export interface AnalyticsScene {
  id: string
  watershedId: string
  sceneIdentifier: string
  platform: string | null
  sensor: string | null
  resolutionM: number | null
  acquiredAt: string
  rasterReference: string | null
  sourceId: string | null
}

export interface AnalyticsAdminArea {
  stateId: string
  stateName: string
  districtId: string
  districtName: string
  watershedId: string
}

export interface AnalyticsWorkspace {
  indicators: AnalyticsIndicator[]
  comparisons: AnalyticsComparison[]
  sources: AnalyticsMethodSource[]
  scenes: AnalyticsScene[]
  watersheds: Array<{ id: string; code: string; name: string }>
  areas: AnalyticsAdminArea[]
  changeFeatures: MapFeatureCollection
  sceneFootprints: MapFeatureCollection
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {}
}

function featureCollection(value: unknown): MapFeatureCollection | null {
  const object = asObject(value)
  return object.type === "FeatureCollection" && Array.isArray(object.features) ? value as MapFeatureCollection : null
}

function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function analysisTypeForIndicator(code: string): AnalyticsType | null {
  return classifyRemoteSensingProduct(code)
}

export async function loadAnalyticsWorkspace(): Promise<AnalyticsWorkspace> {
  const client = getSupabaseClient()
  const [indicatorsResult, changesResult, scenesResult, sourcesResult, watershedsResult, watershedVillagesResult, villagesResult, blocksResult, districtsResult, statesResult, featuresResult, sceneFootprintsResult] = await Promise.all([
    client.from("indicators").select("id, watershed_id, data_source_id, source_observation_id, indicator_code, name, observed_at, value, unit, status, quality_metadata").order("observed_at", { ascending: true }).limit(10000),
    client.from("change_analysis").select("id, watershed_id, status, observed_change, summary, created_at, updated_at, created_by, baseline_indicator_id, comparison_indicator_id, results, metadata").order("created_at", { ascending: false }).limit(5000),
    client.from("satellite_scenes").select("id, watershed_id, scene_identifier, data_source_id, platform, sensor, resolution_m, acquired_at, asset_path").limit(5000),
    client.from("data_sources").select("id, name, organization, license"),
    client.from("watersheds").select("id, code, name").order("name").limit(1000),
    client.from("watershed_villages").select("watershed_id, village_id").limit(10000),
    client.from("villages").select("id, block_id").limit(20000),
    client.from("blocks").select("id, district_id").limit(10000),
    client.from("districts").select("id, state_id, name").limit(5000),
    client.from("states").select("id, name").limit(1000),
    client.rpc("get_change_analysis_feature_collection"),
    client.rpc("get_satellite_scene_footprint_feature_collection"),
  ])
  if (indicatorsResult.error) throw new Error("Analytics indicators could not be loaded. Check indicator access permissions.")
  if (changesResult.error) throw new Error("Change-analysis records could not be loaded. Apply the analytics map migration and check permissions.")
  if (scenesResult.error) throw new Error("Satellite scene metadata could not be loaded. Check the remote-sensing migration and access permissions.")
  if (sourcesResult.error) throw new Error("Data provenance could not be loaded. Check source access permissions.")
  if (sceneFootprintsResult.error) throw new Error("Satellite scene footprints could not be loaded. Apply the temporal comparison map migration.")
  if (watershedsResult.error || watershedVillagesResult.error || villagesResult.error || blocksResult.error || districtsResult.error || statesResult.error) throw new Error("Administrative filter options could not be loaded. Check watershed and administrative data access.")

  const indicatorRows = indicatorsResult.data ?? []
  const indicators = indicatorRows.filter((row) => row.status !== "REJECTED" && row.status !== "ARCHIVED").map((row): AnalyticsIndicator => ({
    id: String(row.id),
    watershedId: String(row.watershed_id),
    code: String(row.indicator_code),
    name: String(row.name),
    observedAt: String(row.observed_at),
    value: Number(row.value),
    unit: String(row.unit),
    status: String(row.status),
    dataSourceId: row.data_source_id ? String(row.data_source_id) : null,
    sourceObservationId: row.source_observation_id ? String(row.source_observation_id) : null,
    sourceSceneId: null,
    methodology: asObject(row.quality_metadata),
  })).filter((row) => Number.isFinite(row.value))

  const changeAreaById = new Map<string, number>()
  const parsedFeatures = featureCollection(featuresResult.data)
  for (const feature of parsedFeatures?.features ?? []) {
    const id = feature.properties?.change_analysis_id
    const area = toOptionalNumber(feature.properties?.affected_area_ha)
    if (typeof id === "string" && area !== null) changeAreaById.set(id, area)
  }
  const comparisons = (changesResult.data ?? []).map((row): AnalyticsComparison => ({
    id: String(row.id),
    watershedId: String(row.watershed_id),
    status: String(row.status),
    observedChange: toOptionalNumber(row.observed_change),
    summary: typeof row.summary === "string" ? row.summary : null,
    createdAt: String(row.created_at),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
    baselineIndicatorId: String(row.baseline_indicator_id),
    comparisonIndicatorId: String(row.comparison_indicator_id),
    resultMetadata: asObject(row.results),
    analysisMetadata: asObject(row.metadata),
    affectedAreaHa: changeAreaById.get(String(row.id)) ?? null,
  }))

  const watersheds = (watershedsResult.data ?? []).map((row) => ({ id: String(row.id), code: String(row.code), name: String(row.name) }))
  const blockToDistrict = new Map((blocksResult.data ?? []).map((row) => [String(row.id), String(row.district_id)]))
  const districtById = new Map((districtsResult.data ?? []).map((row) => [String(row.id), row]))
  const stateById = new Map((statesResult.data ?? []).map((row) => [String(row.id), row]))
  const villageToArea = new Map<string, { districtId: string; stateId: string; districtName: string; stateName: string }>()
  for (const village of villagesResult.data ?? []) {
    const blockId = String(village.block_id)
    const districtId = blockToDistrict.get(blockId)
    const district = districtId ? districtById.get(districtId) : undefined
    const state = district ? stateById.get(String(district.state_id)) : undefined
    if (districtId && district && state) villageToArea.set(String(village.id), { districtId, stateId: String(district.state_id), districtName: String(district.name), stateName: String(state.name) })
  }
  const areasByKey = new Map<string, AnalyticsAdminArea>()
  for (const link of watershedVillagesResult.data ?? []) {
    const watershedId = String(link.watershed_id)
    const area = villageToArea.get(String(link.village_id))
    if (!area) continue
    const key = `${area.stateId}:${area.districtId}:${watershedId}`
    areasByKey.set(key, { ...area, watershedId })
  }

  const sources = (sourcesResult.data ?? []).map((row): AnalyticsMethodSource => ({
    id: String(row.id), name: String(row.name),
    organization: typeof row.organization === "string" ? row.organization : null,
    license: typeof row.license === "string" ? row.license : null,
  }))
  const sourceIds = new Set(indicators.map((item) => item.sourceObservationId).filter((item): item is string => item !== null))
  const observationRows = sourceIds.size
    ? await client.from("satellite_observations").select("id, satellite_scene_id").in("id", [...sourceIds]).limit(10000)
    : { data: [], error: null }
  if (observationRows.error) throw new Error("Indicator source observations could not be loaded.")
  const sceneRows = scenesResult.data ?? []
  const sceneByObservationId = new Map((observationRows.data ?? []).map((row) => [String(row.id), String(row.satellite_scene_id)]))
  const indicatorsWithScene = indicators.map((indicator) => ({ ...indicator, sourceSceneId: indicator.sourceObservationId ? sceneByObservationId.get(indicator.sourceObservationId) ?? null : null }))
  const scenes = sceneRows.map((row): AnalyticsScene => ({
    id: String(row.id), watershedId: String(row.watershed_id), sceneIdentifier: String(row.scene_identifier),
    platform: typeof row.platform === "string" ? row.platform : null,
    sensor: typeof row.sensor === "string" ? row.sensor : null,
    resolutionM: toOptionalNumber(row.resolution_m), acquiredAt: String(row.acquired_at),
    rasterReference: typeof row.asset_path === "string" ? row.asset_path : null,
    sourceId: row.data_source_id ? String(row.data_source_id) : null,
  }))
  return {
    indicators: indicatorsWithScene,
    comparisons,
    sources,
    scenes,
    watersheds,
    areas: [...areasByKey.values()],
    changeFeatures: parsedFeatures ?? { type: "FeatureCollection", features: [] },
    sceneFootprints: featureCollection(sceneFootprintsResult.data) ?? { type: "FeatureCollection", features: [] },
  }
}
