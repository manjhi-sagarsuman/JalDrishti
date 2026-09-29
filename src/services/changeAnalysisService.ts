import { getSupabaseClient } from "../lib/supabase"
import type { MapFeatureCollection } from "../maps"
import type {
  ChangeAnalysisRecord,
  ChangeCalculationInput,
  ChangeCalculationOutput,
} from "../types/changeAnalysis"

/**
 * Calculates numerical change (after_value - before_value) and provides documented physical interpretation.
 * Does NOT assume that positive values always mean improvement.
 */
export function calculateObservedChange(input: {
  before_value: number
  after_value: number
  indicator: string
  processing_method?: string
}): ChangeCalculationOutput {
  const diff = Number((input.after_value - input.before_value).toFixed(4))
  const ind = input.indicator.toUpperCase()
  const method = input.processing_method || "Direct Temporal Difference (after - before)"

  let interpretation = ""
  if (ind.includes("NDVI") || ind.includes("VEGETATION")) {
    if (diff > 0) {
      interpretation = `Recorded NDVI delta of +${diff}. Indicates increased green photosynthetic canopy density or vegetative biomass. Caution: Positive delta does not inherently imply watershed improvement; it may reflect seasonal precipitation, crop cycling, or opportunistic weed expansion.`
    } else if (diff < 0) {
      interpretation = `Recorded NDVI delta of ${diff}. Indicates reduced green canopy density or photosynthetic vigor. May reflect crop harvest, seasonal senescence, or vegetation moisture stress.`
    } else {
      interpretation = `Recorded NDVI delta of 0.0000. Indicates stable green canopy density between the two observation dates.`
    }
  } else if (ind.includes("NDWI") || ind.includes("WATER")) {
    if (diff > 0) {
      interpretation = `Recorded NDWI delta of +${diff}. Indicates increased surface water presence or soil wetness. Caution: Positive delta does not inherently imply improvement; it can indicate increased water retention, seasonal flooding, or surface waterlogging.`
    } else if (diff < 0) {
      interpretation = `Recorded NDWI delta of ${diff}. Indicates decreased surface water area or moisture drawdown.`
    } else {
      interpretation = `Recorded NDWI delta of 0.0000. Indicates unchanged water index status between observation dates.`
    }
  } else {
    interpretation = diff > 0
      ? `Recorded delta of +${diff} across observation dates.`
      : diff < 0
      ? `Recorded delta of ${diff} across observation dates.`
      : `No delta observed (0.0000) across observation dates.`
  }

  return {
    observed_change: diff,
    interpretation,
    formula: "observed_change = after_value - before_value",
    processing_method: method,
  }
}

/**
 * Fetches change analysis map features via PostGIS RPC get_change_analysis_feature_collection()
 */
export async function getChangeAnalysisFeatureCollection(): Promise<MapFeatureCollection> {
  const client = getSupabaseClient()
  const { data, error } = await client.rpc("get_change_analysis_feature_collection")
  if (error) {
    console.error("Failed to load change analysis feature collection:", error)
    return { type: "FeatureCollection", features: [] }
  }
  if (!data || typeof data !== "object" || (data as MapFeatureCollection).type !== "FeatureCollection") {
    return { type: "FeatureCollection", features: [] }
  }
  return data as MapFeatureCollection
}

/**
 * Stores a reproducible change analysis record into Supabase PostGIS
 */
export async function recordChangeAnalysis(input: ChangeCalculationInput): Promise<ChangeAnalysisRecord> {
  const client = getSupabaseClient()
  const calc = calculateObservedChange({
    before_value: input.before_value,
    after_value: input.after_value,
    indicator: input.before_indicator,
    processing_method: input.processing_method,
  })

  const payload = {
    watershed_code: input.watershed_code,
    watershed_id: input.watershed_id,
    before_indicator: input.before_indicator,
    before_date: input.before_date,
    before_value: input.before_value,
    after_indicator: input.after_indicator,
    after_date: input.after_date,
    after_value: input.after_value,
    observed_change: calc.observed_change,
    processing_method: calc.processing_method,
    summary: input.summary || `${input.before_indicator} change analysis (${input.before_date} to ${input.after_date}): ${calc.observed_change}`,
    affected_area: input.affected_area ?? null,
    status: "COMPLETED",
  }

  const { data, error } = await client.from("change_analysis").insert(payload).select().single()
  if (error) throw error
  return data as ChangeAnalysisRecord
}
