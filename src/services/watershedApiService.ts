import { apiRequest, isApiConfigured } from "./apiClient"
import { getSupabaseClient } from "../lib/supabase"
import { SAMPLE_WATERSHEDS } from "./sampleGisData"

export interface WatershedItem {
  id: string
  code: string
  name: string
  state: string
  district: string
  block: string
  villagesCount: number
  areaHectares: number
  interventionsCount: number
  status: "ACTIVE" | "COMPLETED" | "PROPOSED"
  coordinates: [number, number]
}

export async function fetchWatersheds(): Promise<WatershedItem[]> {
  if (isApiConfigured()) {
    try {
      const data = await apiRequest<WatershedItem[]>("/map/watersheds")
      if (Array.isArray(data) && data.length > 0) return data
    } catch (err) {
      console.warn("API /map/watersheds unavailable, falling back to Supabase/sample:", err)
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("watersheds").select("id, code, name, status, metadata")
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((w: any) => ({
          id: w.id,
          code: w.code,
          name: w.name,
          state: "Maharashtra",
          district: w.metadata?.district ?? "Ahmednagar",
          block: w.metadata?.block ?? "Parner",
          villagesCount: w.metadata?.villages_count ?? 4,
          areaHectares: Number(w.metadata?.area_ha ?? 1200),
          interventionsCount: Number(w.metadata?.interventions_count ?? 25),
          status: w.status,
          coordinates: [74.4367, 19.0223]
        }))
      }
    } catch {
      // fallback
    }
  }

  return SAMPLE_WATERSHEDS
}
