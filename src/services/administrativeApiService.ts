import { apiRequest, isApiConfigured } from "./apiClient"
import { getSupabaseClient } from "../lib/supabase"

export interface AdministrativeEntity {
  id: string
  code: string
  name: string
  type: "state" | "district" | "block" | "village"
  stateName: string
  districtName?: string
  blockName?: string
}

export async function fetchDistricts(): Promise<AdministrativeEntity[]> {
  if (isApiConfigured()) {
    try {
      const data = await apiRequest<AdministrativeEntity[]>("/map/districts")
      if (Array.isArray(data)) return data
    } catch {
      // API unavailable
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("districts").select("id, code, name, states(name)")
      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          type: "district",
          stateName: d.states?.name ?? ""
        }))
      }
    } catch {
      // Supabase query error
    }
  }

  return []
}

export async function fetchBlocks(districtId?: string): Promise<AdministrativeEntity[]> {
  if (isApiConfigured()) {
    try {
      const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : ""
      const data = await apiRequest<AdministrativeEntity[]>(`/map/blocks${query}`)
      if (Array.isArray(data)) return data
    } catch {
      // API unavailable
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      let req = supabase.from("blocks").select("id, code, name, districts(name, states(name))")
      if (districtId) req = req.eq("district_id", districtId)
      const { data, error } = await req
      if (!error && Array.isArray(data)) {
        return data.map((b: any) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          type: "block",
          districtName: b.districts?.name,
          stateName: b.districts?.states?.name ?? ""
        }))
      }
    } catch {
      // Supabase query error
    }
  }

  return []
}

export async function fetchVillages(blockId?: string): Promise<AdministrativeEntity[]> {
  if (isApiConfigured()) {
    try {
      const query = blockId ? `?blockId=${encodeURIComponent(blockId)}` : ""
      const data = await apiRequest<AdministrativeEntity[]>(`/map/villages${query}`)
      if (Array.isArray(data)) return data
    } catch {
      // API unavailable
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      let req = supabase.from("villages").select("id, code, name, blocks(name, districts(name))")
      if (blockId) req = req.eq("block_id", blockId)
      const { data, error } = await req
      if (!error && Array.isArray(data)) {
        return data.map((v: any) => ({
          id: v.id,
          code: v.code,
          name: v.name,
          type: "village",
          blockName: v.blocks?.name,
          districtName: v.blocks?.districts?.name,
          stateName: ""
        }))
      }
    } catch {
      // Supabase query error
    }
  }

  return []
}
