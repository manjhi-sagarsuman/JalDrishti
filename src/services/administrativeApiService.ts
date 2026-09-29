import { apiRequest, isApiConfigured } from "./apiClient"
import { getSupabaseClient } from "../lib/supabase"
import { SAMPLE_ADMINISTRATIVE_DATA } from "./sampleGisData"

export interface AdministrativeEntity {
  id: string
  code: string
  name: string
  type: "state" | "district" | "block" | "village"
  stateName: string
  districtName?: string
  blockName?: string
  center: [number, number]
}

export async function fetchDistricts(): Promise<AdministrativeEntity[]> {
  if (isApiConfigured()) {
    try {
      const data = await apiRequest<AdministrativeEntity[]>("/map/districts")
      if (Array.isArray(data) && data.length > 0) return data
    } catch (err) {
      console.warn("API /map/districts unavailable, falling back to Supabase/sample:", err)
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("districts").select("id, code, name, states(name)")
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          type: "district",
          stateName: d.states?.name ?? "Maharashtra",
          center: [74.7496, 19.0948]
        }))
      }
    } catch {
      // fallback
    }
  }

  return SAMPLE_ADMINISTRATIVE_DATA.filter((i) => i.type === "district")
}

export async function fetchBlocks(districtId?: string): Promise<AdministrativeEntity[]> {
  if (isApiConfigured()) {
    try {
      const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : ""
      const data = await apiRequest<AdministrativeEntity[]>(`/map/blocks${query}`)
      if (Array.isArray(data) && data.length > 0) return data
    } catch (err) {
      console.warn("API /map/blocks unavailable, falling back to Supabase/sample:", err)
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      let req = supabase.from("blocks").select("id, code, name, districts(name, states(name))")
      if (districtId) req = req.eq("district_id", districtId)
      const { data, error } = await req
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((b: any) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          type: "block",
          districtName: b.districts?.name,
          stateName: b.districts?.states?.name ?? "Maharashtra",
          center: [74.4418, 19.0028]
        }))
      }
    } catch {
      // fallback
    }
  }

  return SAMPLE_ADMINISTRATIVE_DATA.filter((i) => i.type === "block")
}

export async function fetchVillages(blockId?: string): Promise<AdministrativeEntity[]> {
  if (isApiConfigured()) {
    try {
      const query = blockId ? `?blockId=${encodeURIComponent(blockId)}` : ""
      const data = await apiRequest<AdministrativeEntity[]>(`/map/villages${query}`)
      if (Array.isArray(data) && data.length > 0) return data
    } catch (err) {
      console.warn("API /map/villages unavailable, falling back to Supabase/sample:", err)
    }
  }

  return SAMPLE_ADMINISTRATIVE_DATA.filter((i) => i.type === "village")
}
