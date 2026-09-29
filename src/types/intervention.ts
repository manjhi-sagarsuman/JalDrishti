export type InterventionStatus = "PLANNED" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | string

export type SupportedInterventionType =
  | "Check Dam"
  | "Farm Pond"
  | "Contour Bund"
  | "Percolation Tank"
  | "Recharge Structure"
  | "Watershed Treatment"
  | "Other"
  | string

export interface InterventionRecord {
  id: string
  code: string | null
  name: string
  watershedId: string
  watershedName?: string
  watershedCode?: string
  villageId?: string | null
  villageName?: string | null
  blockName?: string | null
  districtName?: string | null
  type: string
  status: InterventionStatus
  latitude: number | null
  longitude: number | null
  startDate?: string | null
  completionDate?: string | null
  description?: string | null
  metadata?: Record<string, unknown> | null
  source?: string | null
  provenance?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface InterventionFeatureProperties {
  layerId: "interventions"
  code: string
  name: string
  title?: string
  type: string
  status: string
  district: string
  block: string
  village: string
  watershed: string
  intervention_id?: string
  watershed_id?: string
  village_id?: string | null
  latitude?: number | null
  longitude?: number | null
  start_date?: string | null
  completion_date?: string | null
  implementation_date?: string | null
  [key: string]: unknown
}
