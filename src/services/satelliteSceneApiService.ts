import { getSupabaseClient } from "../lib/supabase"
import type { MapFeatureCollection } from "../maps"
import type { SatelliteSceneProperties } from "../types/satellite"

const EMPTY_SCENE_COLLECTION: MapFeatureCollection = {
  type: "FeatureCollection",
  features: [],
}

/**
 * Loads the real satellite scene footprints from Supabase PostGIS RPC.
 * Returns GeoJSON FeatureCollection formatted for MapLibre layer 'satellite-scenes'.
 */
export async function loadSatelliteSceneFootprints(): Promise<MapFeatureCollection> {
  const client = getSupabaseClient()

  // First try the specialized RPC get_satellite_scene_footprint_feature_collection
  const { data, error } = await client.rpc("get_satellite_scene_footprint_feature_collection")
  if (!error && data && typeof data === "object") {
    const fc = data as MapFeatureCollection
    if (fc.type === "FeatureCollection" && Array.isArray(fc.features)) {
      return fc
    }
  }

  // Fallback: Query satellite_scenes directly if RPC is not deployed yet
  const { data: rows, error: selectError } = await client
    .from("satellite_scenes")
    .select("id, scene_id, scene_identifier, platform, sensor, acquisition_date, acquired_at, cloud_cover, cloud_cover_percent, crs, asset_reference_path, asset_path, status, watershed_id, watersheds(code, name)")
    .order("acquired_at", { ascending: false })
    .limit(1000)

  if (selectError || !rows) {
    return EMPTY_SCENE_COLLECTION
  }

  // When footprint geometry is not queried directly via standard select, return empty or mapped features
  return {
    type: "FeatureCollection",
    features: rows.map((row: any) => {
      const sceneId = row.scene_id || row.scene_identifier || row.id
      const watershedCode = row.watersheds?.code || "Unknown"
      const props: SatelliteSceneProperties = {
        layerId: "satellite-scenes",
        sceneId,
        title: sceneId,
        platform: row.platform,
        sensor: row.sensor,
        acquisitionDate: row.acquisition_date || row.acquired_at,
        cloudCover: row.cloud_cover ?? row.cloud_cover_percent ?? null,
        watershed: watershedCode,
        assetReference: row.asset_reference_path || row.asset_path || null,
        crs: row.crs || "EPSG:4326",
        status: row.status,
      }

      return {
        type: "Feature",
        id: row.id,
        geometry: {
          type: "MultiPolygon",
          coordinates: [],
        },
        properties: props as unknown as Record<string, unknown>,
      }
    }),
  }
}

/**
 * Validates STAC / metadata asset reference for satellite imagery.
 * Large raster assets (GeoTIFF / COG) must be referenced via external STAC or HTTPS URLs,
 * never stored directly as raster bytes in relational table rows.
 */
export function validateSatelliteAssetReference(reference: string | null): boolean {
  if (!reference) return false
  const trimmed = reference.trim()
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("s3://") ||
    trimmed.startsWith("stac://") ||
    trimmed.startsWith("bhuvan://")
  )
}
