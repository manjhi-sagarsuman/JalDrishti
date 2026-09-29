export interface ChangeAnalysisRecord {
  id: string
  watershed_code: string
  watershed_id?: string
  before_indicator: string
  before_date: string
  before_value: number
  after_indicator: string
  after_date: string
  after_value: number
  observed_change: number
  affected_area?: unknown | null
  processing_method: string
  summary: string
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REVIEWED"
  created_at?: string
  updated_at?: string
}

export interface ChangeCalculationInput {
  watershed_code: string
  watershed_id?: string
  before_indicator: string
  before_date: string
  before_value: number
  after_indicator: string
  after_date: string
  after_value: number
  processing_method?: string
  summary?: string
  affected_area?: unknown | null
}

export interface ChangeCalculationOutput {
  observed_change: number
  interpretation: string
  formula: string
  processing_method: string
}
