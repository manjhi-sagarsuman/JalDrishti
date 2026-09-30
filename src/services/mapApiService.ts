import type { MapFeatureCollection } from "../maps"

export type MapApiLayer =
  | "districts"
  | "blocks"
  | "villages"
  | "watersheds"
  | "interventions"
  | "evidence"
  | "satellite-scenes"
  | "change-analysis"

const emptyFeatures: MapFeatureCollection = { type: "FeatureCollection", features: [] }

function parseFeatureCollection(value: unknown): MapFeatureCollection {
  if (typeof value !== "object" || value === null) return emptyFeatures
  const object = value as Record<string, unknown>
  return object.type === "FeatureCollection" && Array.isArray(object.features)
    ? (value as MapFeatureCollection)
    : emptyFeatures
}

/**
 * Resolves the centralized Map API endpoint URL.
 * Routes directly to central backend API (GET /map/:layer) when configured,
 * or via Supabase Edge Function map-api proxy.
 */
export function getMapApiUrl(layer: MapApiLayer): string {
  const customBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
  if (customBaseUrl) {
    return `${customBaseUrl.replace(/\/$/, "")}/map/${layer}`
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/map-api/map/${layer}`
  }
  return `/map/${layer}`
}

/**
 * Loads a single GeoJSON layer from the centralized Map API.
 * Returns proper HTTP errors without silently replacing failed requests with fake GIS data.
 */
export async function loadMapLayer(layer: MapApiLayer): Promise<MapFeatureCollection> {
  const url = getMapApiUrl(layer)
  const publishableKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
  )?.trim()

  const headers: Record<string, string> = {
    Accept: "application/geo+json, application/json",
  }
  if (publishableKey) {
    headers["apikey"] = publishableKey
    headers["Authorization"] = `Bearer ${publishableKey}`
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "")
    throw new Error(
      `Central Map API error (${response.status}) fetching /map/${layer}: ${
        errorBody || response.statusText
      }`
    )
  }

  const payload = await response.json()
  return parseFeatureCollection(payload)
}

/**
 * Fetches all official map feature layers concurrently from the centralized Map API.
 */
export async function loadRealMapFeatures(): Promise<MapFeatureCollection> {
  const layers: MapApiLayer[] = [
    "districts",
    "blocks",
    "villages",
    "watersheds",
    "interventions",
    "evidence",
    "satellite-scenes",
    "change-analysis",
  ]

  const results = await Promise.all(layers.map((layer) => loadMapLayer(layer)))
  return {
    type: "FeatureCollection",
    features: results.flatMap((result) => result.features),
  }
}
