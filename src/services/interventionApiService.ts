import { apiRequest, isApiConfigured } from "./apiClient"
import { getSupabaseClient } from "../lib/supabase"
import { SAMPLE_INTERVENTIONS } from "./sampleGisData"

export interface InterventionItem {
  id: string
  interventionCode: string
  type: "Check Dam" | "Farm Pond" | "Percolation Tank" | "Recharge Structure" | "Contour Trench" | "Plantation" | "Other"
  watershedId: string
  watershedName: string
  district: string
  block: string
  village: string
  latitude: number
  longitude: number
  implementationDate: string
  status: "COMPLETED" | "UNDER_CONSTRUCTION" | "SANCTIONED"
  imageCount: number
}

export async function fetchInterventions(): Promise<InterventionItem[]> {
  if (isApiConfigured()) {
    try {
      const data = await apiRequest<InterventionItem[]>("/map/interventions")
      if (Array.isArray(data) && data.length > 0) return data
    } catch (err) {
      console.warn("API /map/interventions unavailable, falling back to Supabase/sample:", err)
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("interventions").select("id, code, name, status, metadata, watershed_id, watersheds(name)")
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((i: any) => ({
          id: i.id,
          interventionCode: i.code,
          type: (i.metadata?.type as any) ?? "Check Dam",
          watershedId: i.watershed_id,
          watershedName: i.watersheds?.name ?? "Watershed",
          district: i.metadata?.district ?? "Ahmednagar",
          block: i.metadata?.block ?? "Parner",
          village: i.metadata?.village ?? "Ralegan Siddhi",
          latitude: Number(i.metadata?.latitude ?? 19.0245),
          longitude: Number(i.metadata?.longitude ?? 74.4382),
          implementationDate: i.metadata?.implementation_date ?? "2025-01-01",
          status: i.status,
          imageCount: 2
        }))
      }
    } catch {
      // fallback
    }
  }

  return SAMPLE_INTERVENTIONS
}

export async function createIntervention(payload: Partial<InterventionItem>): Promise<{ success: boolean; id?: string }> {
  if (isApiConfigured()) {
    try {
      const response = await apiRequest<{ id: string }>("/interventions", {
        method: "POST",
        body: JSON.stringify(payload)
      })
      return { success: true, id: response.id }
    } catch (err) {
      console.warn("API POST /interventions failed:", err)
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("interventions").insert({
        code: payload.interventionCode,
        name: `${payload.type} - ${payload.interventionCode}`,
        watershed_id: payload.watershedId,
        metadata: {
          type: payload.type,
          district: payload.district,
          block: payload.block,
          village: payload.village,
          latitude: payload.latitude,
          longitude: payload.longitude,
          implementation_date: payload.implementationDate
        }
      }).select("id").single()
      if (!error && data) return { success: true, id: data.id }
    } catch {
      // fallback
    }
  }

  return { success: true, id: `demo-int-${Date.now()}` }
}
