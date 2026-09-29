import { getSupabaseClient } from "../lib/supabase"

export interface ManagedRecord {
  id: string
  name: string
  type: string
  status: string
  date: string | null
  source: string
  reference: string
  details: string
  checksum?: string | null
}

export interface DataManagementWorkspace {
  sources: ManagedRecord[]
  scenes: ManagedRecord[]
  observations: ManagedRecord[]
  photos: ManagedRecord[]
}

export async function loadDataManagementWorkspace(): Promise<DataManagementWorkspace> {
  const client = getSupabaseClient()
  const [sources, scenes, observations, photos] = await Promise.all([
    client.from("data_sources").select("id, code, name, organization, source_url, status, updated_at").order("name").limit(2000),
    client.from("satellite_scenes").select("id, scene_identifier, platform, sensor, status, acquired_at, data_source_id, asset_path, updated_at").order("acquired_at", { ascending: false }).limit(5000),
    client.from("satellite_observations").select("id, observation_code, statistic, status, observed_at, data_source_id, raster_asset_path, updated_at").order("observed_at", { ascending: false }).limit(5000),
    client.from("geo_photos").select("id, file_name, mime_type, file_size_bytes, sha256, location, captured_at, gps_validation, verification_status, storage_path, updated_at").order("created_at", { ascending: false }).limit(5000),
  ])
  if (sources.error || scenes.error || observations.error || photos.error) throw new Error("Data management records could not be loaded. Check the required migrations and your authorized data scope.")
  const sourceNames = new Map((sources.data ?? []).map((row) => [String(row.id), String(row.name)]))
  return {
    sources: (sources.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name), type: "Registered source", status: String(row.status), date: typeof row.updated_at === "string" ? row.updated_at : null, source: typeof row.organization === "string" ? row.organization : "Not recorded", reference: typeof row.source_url === "string" ? row.source_url : String(row.code), details: String(row.code) })),
    scenes: (scenes.data ?? []).map((row) => ({ id: String(row.id), name: String(row.scene_identifier), type: "GeoTIFF / raster reference", status: String(row.status), date: typeof row.acquired_at === "string" ? row.acquired_at : null, source: row.data_source_id ? sourceNames.get(String(row.data_source_id)) ?? "Source not linked" : "Source not linked", reference: typeof row.asset_path === "string" ? row.asset_path : String(row.id), details: [row.platform, row.sensor].filter(Boolean).join(" / ") || "Platform not recorded" })),
    observations: (observations.data ?? []).map((row) => ({ id: String(row.id), name: String(row.observation_code), type: "Satellite observation", status: String(row.status), date: typeof row.observed_at === "string" ? row.observed_at : null, source: row.data_source_id ? sourceNames.get(String(row.data_source_id)) ?? "Source not linked" : "Source not linked", reference: typeof row.raster_asset_path === "string" ? row.raster_asset_path : String(row.id), details: typeof row.statistic === "string" ? row.statistic : "Statistic not recorded" })),
    photos: (photos.data ?? []).map((row) => ({ id: String(row.id), name: String(row.file_name), type: String(row.mime_type), status: String(row.verification_status), date: typeof row.captured_at === "string" ? row.captured_at : null, source: String(row.gps_validation), reference: String(row.storage_path), details: `${row.file_size_bytes === null ? "Size not recorded" : `${Number(row.file_size_bytes)} bytes`} / ${row.location ? "Location present" : "Location missing"}`, checksum: typeof row.sha256 === "string" ? row.sha256.toLowerCase() : null })),
  }
}
