import type { MapFeatureCollection } from "../maps"

export type MapApiLayer = "districts" | "blocks" | "villages" | "watersheds" | "interventions" | "evidence" | "satellite-scenes" | "change-analysis"

const emptyFeatures: MapFeatureCollection = { type: "FeatureCollection", features: [] }

function parseFeatureCollection(value: unknown): MapFeatureCollection {
  if (typeof value !== "object" || value === null) return emptyFeatures
  const object = value as Record<string, unknown>
  return object.type === "FeatureCollection" && Array.isArray(object.features) ? value as MapFeatureCollection : emptyFeatures
}

export async function loadMapLayer(layer: MapApiLayer): Promise<MapFeatureCollection> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
  const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim()
  if (!supabaseUrl || !publishableKey) throw new Error("The map API is not configured.")
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/map-api/${layer}`, { headers: { apikey: publishableKey } })
  if (!response.ok) throw new Error(`The ${layer} map layer could not be loaded.`)
  return parseFeatureCollection(await response.json())
}

export async function loadRealMapFeatures(): Promise<MapFeatureCollection> {
  const layers: MapApiLayer[] = ["districts", "blocks", "villages", "watersheds", "interventions", "evidence", "satellite-scenes", "change-analysis"]
  const results = await Promise.all(layers.map((layer) => loadMapLayer(layer)))
  return { type: "FeatureCollection", features: results.flatMap((result) => result.features) }
}