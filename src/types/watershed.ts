export type WatershedStatus = "ACTIVE" | "PLANNED" | "ARCHIVED" | "COMPLETED" | "PROPOSED" | string

export interface WatershedRecord {
  id: string
  code: string
  watershedCode?: string
  name: string
  watershedName?: string
  linkedVillageCode?: string | null
  stateId?: string | null
  state?: string | null
  districtId?: string | null
  district?: string | null
  blockId?: string | null
  block?: string | null
  villageId?: string | null
  village?: string | null
  areaKm2?: number | null
  areaSqKm?: number | null
  centroidLatitude?: number | null
  centroidLongitude?: number | null
  status: WatershedStatus
  boundary?: unknown
  source?: string | null
  provenance?: Record<string, unknown> | null
  updatedAt?: string | null
  createdAt?: string | null
}

export interface WatershedFeatureProperties {
  layerId: "watershed-boundary"
  title: string
  code: string
  district?: string
  block?: string
  village?: string
  areaKm2?: number | null
  status: string
  centroid_lat?: number | null
  centroid_lng?: number | null
  watershed_id?: string
  [key: string]: unknown
}
