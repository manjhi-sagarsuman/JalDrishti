export interface SatelliteSceneRecordChunk8 {
  id: string
  scene_id: string
  watershed_code: string
  watershed_id?: string
  platform: string | null
  sensor: string | null
  acquisition_date: string
  cloud_cover: number | null
  crs: string
  footprint: GeoJSON.MultiPolygon | GeoJSON.Polygon
  asset_reference_path: string | null
  source_provenance?: Record<string, unknown>
  status?: string
}

export interface SatelliteSceneProperties {
  layerId: "satellite-scenes"
  sceneId: string
  title: string
  platform: string | null
  sensor: string | null
  acquisitionDate: string
  cloudCover: number | null
  watershed: string
  assetReference: string | null
  crs?: string
  status?: string
}
