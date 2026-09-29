import { apiRequest, isApiConfigured } from "./apiClient"
import { getSupabaseClient } from "../lib/supabase"

export interface InterventionItem {
  id: string
  interventionCode: string
  type: string
  watershedId: string
  watershedName: string
  district: string
  block: string
  village: string
  latitude: number
  longitude: number
  implementationDate: string
  status: string
  imageCount: number
}

export async function fetchInterventions(): Promise<InterventionItem[]> {
  if (isApiConfigured()) {
    try {
      const data = await apiRequest<InterventionItem[]>("/map/interventions")
      if (Array.isArray(data)) return data
    } catch {
      // API unavailable
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("interventions").select("id, code, name, status, metadata, watershed_id, watersheds(name)")
      if (!error && Array.isArray(data)) {
        return data.map((i: any) => ({
          id: i.id,
          interventionCode: i.code,
          type: String(i.metadata?.type ?? "Intervention"),
          watershedId: i.watershed_id,
          watershedName: i.watersheds?.name ?? "",
          district: i.metadata?.district ?? "",
          block: i.metadata?.block ?? "",
          village: i.metadata?.village ?? "",
          latitude: Number(i.metadata?.latitude ?? 0),
          longitude: Number(i.metadata?.longitude ?? 0),
          implementationDate: i.metadata?.implementation_date ?? "",
          status: i.status,
          imageCount: 0
        }))
      }
    } catch {
      // Supabase query error
    }
  }

  return []
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
        name: `${payload.type ?? "Intervention"} - ${payload.interventionCode ?? ""}`,
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
      // Supabase insert error
    }
  }

  return { success: false }
}
