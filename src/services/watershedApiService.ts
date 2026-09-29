import { apiRequest, isApiConfigured } from "./apiClient"
import { getSupabaseClient } from "../lib/supabase"

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
}

export async function fetchWatersheds(): Promise<WatershedItem[]> {
  if (isApiConfigured()) {
    try {
      const data = await apiRequest<WatershedItem[]>("/map/watersheds")
      if (Array.isArray(data)) return data
    } catch {
      // API unavailable
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("watersheds").select("id, code, name, status, metadata")
      if (!error && Array.isArray(data)) {
        return data.map((w: any) => ({
          id: w.id,
          code: w.code,
          name: w.name,
          state: w.metadata?.state ?? "",
          district: w.metadata?.district ?? "",
          block: w.metadata?.block ?? "",
          villagesCount: Number(w.metadata?.villages_count ?? 0),
          areaHectares: Number(w.metadata?.area_ha ?? 0),
          interventionsCount: Number(w.metadata?.interventions_count ?? 0),
          status: w.status
        }))
      }
    } catch {
      // Supabase query error
    }
  }

  return []
}
