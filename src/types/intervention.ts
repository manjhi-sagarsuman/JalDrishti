export type InterventionType =
  | "check dam"
  | "farm pond"
  | "contour bund"
  | "percolation tank"
  | "recharge structure"
  | "watershed treatment"
  | "other"

export type InterventionStatus = "PLANNED" | "ONGOING" | "COMPLETED" | "MAINTENANCE" | "REJECTED"

export interface InterventionRecord {
  id: string
  code: string
  name: string
  watershedId?: string
  villageId?: string
  type: InterventionType
  status: InterventionStatus
  latitude: number
  longitude: number
  startDate?: string
  completionDate?: string
  description?: string
  district?: string
  block?: string
  village?: string
  watershed?: string
  source?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}
