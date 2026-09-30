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
