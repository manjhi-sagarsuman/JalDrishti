<<<<<<< HEAD
import type { FeatureCollection, Geometry } from "geojson"

export interface WatershedSummary {
  id: string
  code: string
  name: string
  stateName?: string
  districtName?: string
  blockName?: string
  areaHectares?: number
  perimeterKm?: number
  drainageDensity?: number
}

export interface WatershedFeatureProperties {
  layerId: string
  id: string
  name: string
  code?: string
  state?: string
  district?: string
  area_ha?: number
  [key: string]: unknown
}

export type WatershedFeatureCollection = FeatureCollection<Geometry, WatershedFeatureProperties>

export interface InterventionSummary {
  id: string
  watershedId: string
  interventionTypeId: string
  name: string
  code?: string
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "MAINTENANCE"
  latitude?: number
  longitude?: number
  completionDate?: string
}

export interface ObservationSummary {
  id: string
  watershedId: string
  observationType: string
  capturedAt: string
  latitude?: number
  longitude?: number
  verificationStatus: "VERIFIED" | "PENDING" | "REJECTED"
}
=======
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
>>>>>>> 5fac4f57a0ac6a7fea27adc80895691b645a096f
