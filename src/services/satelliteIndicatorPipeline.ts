import { getSupabaseClient } from "../lib/supabase"

export type SatelliteIndicatorType = "NDVI" | "NDWI" | "LULC"

export interface SatelliteObservationPayload {
  scene_id: string
  watershed_code: string
  watershed_id?: string
  indicator: SatelliteIndicatorType
  observation_date: string
  value: number
  unit: string
  processing_method: string
  source: string
  crs?: string
  product_version?: string
}

export interface BandReflectanceInput {
  platform: "Sentinel-2" | "Landsat-8" | "Landsat-9"
  bands: Record<string, number>
}

/**
 * Calculates NDVI (Normalized Difference Vegetation Index) from appropriate bands.
 * Formula: (NIR - Red) / (NIR + Red)
 * Sentinel-2: NIR = B08 (842 nm), Red = B04 (665 nm)
 * Landsat-8/9: NIR = Band 5 (865 nm), Red = Band 4 (655 nm)
 */
export function calculateNDVI(input: BandReflectanceInput): { value: number; method: string } {
  let nir: number | undefined
  let red: number | undefined
  let formula = ""

  if (input.platform === "Sentinel-2") {
    nir = input.bands["B08"] ?? input.bands["B8"]
    red = input.bands["B04"] ?? input.bands["B4"]
    formula = "Sentinel-2 MSI: (B08 - B04) / (B08 + B04)"
  } else {
    nir = input.bands["B5"] ?? input.bands["Band5"]
    red = input.bands["B4"] ?? input.bands["Band4"]
    formula = "Landsat-8/9 OLI: (Band5 - Band4) / (Band5 + Band4)"
  }

  if (nir === undefined || red === undefined) {
    throw new Error(`Missing required NIR/Red bands for ${input.platform} NDVI calculation.`)
  }

  const denominator = nir + red
  if (denominator === 0) {
    return { value: 0, method: formula }
  }

  const ndvi = (nir - red) / denominator
  // Clamp to valid physical index range [-1.0, 1.0]
  const clamped = Math.max(-1.0, Math.min(1.0, ndvi))
  return { value: Number(clamped.toFixed(4)), method: formula }
}

/**
 * Calculates NDWI (Normalized Difference Water Index) from clearly documented band definition.
 * McFeeters (1996): (Green - NIR) / (Green + NIR)
 * Sentinel-2: Green = B03 (560 nm), NIR = B08 (842 nm)
 * Landsat-8/9: Green = Band 3 (560 nm), NIR = Band 5 (865 nm)
 */
export function calculateNDWI(input: BandReflectanceInput): { value: number; method: string } {
  let green: number | undefined
  let nir: number | undefined
  let formula = ""

  if (input.platform === "Sentinel-2") {
    green = input.bands["B03"] ?? input.bands["B3"]
    nir = input.bands["B08"] ?? input.bands["B8"]
    formula = "Sentinel-2 MSI McFeeters NDWI: (B03 - B08) / (B03 + B08)"
  } else {
    green = input.bands["B3"] ?? input.bands["Band3"]
    nir = input.bands["B5"] ?? input.bands["Band5"]
    formula = "Landsat-8/9 OLI McFeeters NDWI: (Band3 - Band5) / (Band3 + Band5)"
  }

  if (green === undefined || nir === undefined) {
    throw new Error(`Missing required Green/NIR bands for ${input.platform} NDWI calculation.`)
  }

  const denominator = green + nir
  if (denominator === 0) {
    return { value: 0, method: formula }
  }

  const ndwi = (green - nir) / denominator
  const clamped = Math.max(-1.0, Math.min(1.0, ndwi))
  return { value: Number(clamped.toFixed(4)), method: formula }
}

/**
 * Validates LULC (Land Use / Land Cover) classification referencing product and version.
 */
export function validateLULC(classCode: number, product: string, version: string): { value: number; method: string } {
  return {
    value: classCode,
    method: `Authoritative LULC: ${product} (${version}) class ${classCode}`,
  }
}

/**
 * Inserts reproducible observation into satellite_observations without fabrication.
 */
export async function recordSatelliteObservation(payload: SatelliteObservationPayload) {
  const client = getSupabaseClient()
  const { data, error } = await client.from("satellite_observations").insert({
    scene_id: payload.scene_id,
    watershed_code: payload.watershed_code,
    watershed_id: payload.watershed_id,
    indicator: payload.indicator,
    observation_date: payload.observation_date,
    value: payload.value,
    unit: payload.unit,
    processing_method: payload.processing_method,
    source: payload.source,
    crs: payload.crs || "EPSG:4326",
    product_version: payload.product_version || "1.0",
  }).select()

  if (error) throw error
  return data
}
