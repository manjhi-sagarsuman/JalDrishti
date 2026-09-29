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
  indicator?: string
  processingMethod?: string | null
  crs?: string | null
  productVersion?: string | null
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
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}
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
  const [
    indicatorsResult,
    satObsResult,
    changesResult,
    scenesResult,
    sourcesResult,
    watershedsResult,
    watershedVillagesResult,
    villagesResult,
    blocksResult,
    districtsResult,
    statesResult,
    featuresResult,
    sceneFootprintsResult
  ] = await Promise.all([
    client.from("indicators").select("id, watershed_id, data_source_id, source_observation_id, indicator_code, name, observed_at, value, unit, status, quality_metadata").order("observed_at", { ascending: true }).limit(10000),
    client.from("satellite_observations").select("id, watershed_id, data_source_id, satellite_scene_id, scene_id, observation_code, indicator, observed_at, observation_date, value, unit, status, processing_method, crs, product_version, source").order("observed_at", { ascending: true }).limit(10000),
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

  if (indicatorsResult.error && satObsResult.error) throw new Error("Analytics indicators could not be loaded. Check indicator access permissions.")
  if (changesResult.error) throw new Error("Change-analysis records could not be loaded. Apply the analytics map migration and check permissions.")
  if (scenesResult.error) throw new Error("Satellite scene metadata could not be loaded. Check the remote-sensing migration and access permissions.")
  if (sourcesResult.error) throw new Error("Data provenance could not be loaded. Check source access permissions.")
  if (sceneFootprintsResult.error) throw new Error("Satellite scene footprints could not be loaded. Apply the temporal comparison map migration.")
  if (watershedsResult.error || watershedVillagesResult.error || villagesResult.error || blocksResult.error || districtsResult.error || statesResult.error) throw new Error("Administrative filter options could not be loaded. Check watershed and administrative data access.")

  const indicatorRows = indicatorsResult.data ?? []
  const satObsRows = satObsResult.data ?? []

  const indicators: AnalyticsIndicator[] = []

  // Add indicators from indicators table
  for (const row of indicatorRows) {
    if (row.status === "REJECTED" || row.status === "ARCHIVED") continue
    const val = Number(row.value)
    if (!Number.isFinite(val)) continue
    indicators.push({
      id: String(row.id),
      watershedId: String(row.watershed_id),
      code: String(row.indicator_code),
      name: String(row.name),
      observedAt: String(row.observed_at),
      value: val,
      unit: String(row.unit),
      status: String(row.status),
      dataSourceId: row.data_source_id ? String(row.data_source_id) : null,
      sourceObservationId: row.source_observation_id ? String(row.source_observation_id) : null,
      sourceSceneId: null,
      methodology: asObject(row.quality_metadata),
    })
  }

  // Add real satellite_observations
  for (const row of satObsRows) {
    if (row.status === "FAILED" || row.status === "ARCHIVED") continue
    const val = Number(row.value)
    if (!Number.isFinite(val)) continue
    const indCode = String(row.indicator || row.observation_code || "NDVI")
    const obsDate = String(row.observation_date || row.observed_at)
    const sceneId = String(row.scene_id || row.satellite_scene_id || "")

    indicators.push({
      id: String(row.id),
      watershedId: String(row.watershed_id),
      code: indCode,
      name: indCode,
      observedAt: obsDate,
      value: val,
      unit: String(row.unit || "index"),
      status: String(row.status || "AVAILABLE"),
      dataSourceId: row.data_source_id ? String(row.data_source_id) : null,
      sourceObservationId: String(row.id),
      sourceSceneId: sceneId || null,
      methodology: {
        processing_method: row.processing_method,
        crs: row.crs,
        product_version: row.product_version,
        source: row.source,
      },
      indicator: indCode,
      processingMethod: row.processing_method,
      crs: row.crs,
      productVersion: row.product_version,
    })
  }

  const changeAreaById = new Map<string, number>()
  const parsedFeatures = featureCollection(featuresResult.data)
  for (const feature of parsedFeatures?.features ?? []) {
    const id = feature.properties?.change_analysis_id
    const area = toOptionalNumber(feature.properties?.affected_area_ha)
    if (typeof id === "string" && area !== null) changeAreaById.set(id, area)
  }

  const comparisons = (changesResult.data ?? []).map((row): AnalyticsComparison => {
    const results = asObject(row.results)
    const metadata = asObject(row.metadata)
    const area = changeAreaById.get(String(row.id)) ?? toOptionalNumber(results.affected_area_ha)
    return {
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
      resultMetadata: results,
      analysisMetadata: metadata,
      affectedAreaHa: area,
    }
  })

  const sources = (sourcesResult.data ?? []).map((row): AnalyticsMethodSource => ({
    id: String(row.id),
    name: String(row.name),
    organization: typeof row.organization === "string" ? row.organization : null,
    license: typeof row.license === "string" ? row.license : null,
  }))

  const scenes = (scenesResult.data ?? []).map((row): AnalyticsScene => ({
    id: String(row.id),
    watershedId: String(row.watershed_id),
    sceneIdentifier: String(row.scene_identifier),
    platform: typeof row.platform === "string" ? row.platform : null,
    sensor: typeof row.sensor === "string" ? row.sensor : null,
    resolutionM: toOptionalNumber(row.resolution_m),
    acquiredAt: String(row.acquired_at),
    rasterReference: typeof row.asset_path === "string" ? row.asset_path : null,
    sourceId: row.data_source_id ? String(row.data_source_id) : null,
  }))

  const watersheds = (watershedsResult.data ?? []).map((row) => ({
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
  }))

  const blockByVillageId = new Map((villagesResult.data ?? []).map((row) => [String(row.id), String(row.block_id)]))
  const districtByBlockId = new Map((blocksResult.data ?? []).map((row) => [String(row.id), String(row.district_id)]))
  const districtById = new Map((districtsResult.data ?? []).map((row) => [String(row.id), { stateId: String(row.state_id), name: String(row.name) }]))
  const stateById = new Map((statesResult.data ?? []).map((row) => [String(row.id), String(row.name)]))

  const areas: AnalyticsAdminArea[] = []
  const seenAreaKeys = new Set<string>()
  for (const row of watershedVillagesResult.data ?? []) {
    const watershedId = String(row.watershed_id)
    const villageId = String(row.village_id)
    const blockId = blockByVillageId.get(villageId)
    const districtId = blockId ? districtByBlockId.get(blockId) : undefined
    const district = districtId ? districtById.get(districtId) : undefined
    const stateName = district ? stateById.get(district.stateId) : undefined
    if (!districtId || !district || !stateName) continue
    const key = `${district.stateId}:${districtId}:${watershedId}`
    if (seenAreaKeys.has(key)) continue
    seenAreaKeys.add(key)
    areas.push({
      stateId: district.stateId,
      stateName,
      districtId,
      districtName: district.name,
      watershedId,
    })
  }

  return {
    indicators,
    comparisons,
    sources,
    scenes,
    watersheds,
    areas,
    changeFeatures: featureCollection(featuresResult.data) ?? { type: "FeatureCollection", features: [] },
    sceneFootprints: featureCollection(sceneFootprintsResult.data) ?? { type: "FeatureCollection", features: [] },
  }
}
