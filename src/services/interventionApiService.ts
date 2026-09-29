import { apiRequest, isApiConfigured } from "./apiClient"
import { getSupabaseClient } from "../lib/supabase"
import type { MapFeatureCollection } from "../maps"

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

export interface InterventionFilterOptions {
  watershedId?: string
  status?: string
  type?: string
}

export async function fetchInterventions(filters?: InterventionFilterOptions): Promise<InterventionItem[]> {
  if (isApiConfigured()) {
    try {
      const data = await apiRequest<InterventionItem[]>("/map/interventions")
      if (Array.isArray(data)) {
        let result = data
        if (filters?.watershedId) {
          result = result.filter(item => item.watershedId === filters.watershedId)
        }
        if (filters?.status) {
          result = result.filter(item => item.status.toLowerCase() === filters.status!.toLowerCase())
        }
        if (filters?.type) {
          result = result.filter(item => item.type.toLowerCase() === filters.type!.toLowerCase())
        }
        return result
      }
    } catch {
      // Fall through to Supabase
    }
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase
      .from("interventions")
      .select(`
        id,
        code,
        name,
        watershed_id,
        village_id,
        type,
        status,
        latitude,
        longitude,
        start_date,
        completion_date,
        description,
        metadata,
        created_at,
        updated_at,
        watersheds (
          id,
          code,
          name
        ),
        villages (
          id,
          code,
          name,
          blocks (
            id,
            code,
            name,
            districts (
              id,
              code,
              name
            )
          )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(1000)

    if (filters?.watershedId) {
      query = query.eq("watershed_id", filters.watershedId)
    }
    if (filters?.status) {
      query = query.eq("status", filters.status)
    }
    if (filters?.type) {
      query = query.eq("type", filters.type)
    }

    const { data, error } = await query
    if (error || !Array.isArray(data)) return []

    return data.map((i: any) => {
      const meta = typeof i.metadata === "object" && i.metadata !== null ? i.metadata : {}
      const villageObj = i.villages
      const blockObj = villageObj?.blocks
      const districtObj = blockObj?.districts

      const districtName = districtObj?.name || meta.district || ""
      const blockName = blockObj?.name || meta.block || ""
      const villageName = villageObj?.name || meta.village || ""

      const lat = Number(i.latitude ?? meta.latitude ?? 0)
      const lng = Number(i.longitude ?? meta.longitude ?? 0)

      return {
        id: i.id,
        interventionCode: i.code || `INT-${String(i.id).slice(0, 8).toUpperCase()}`,
        type: i.type || String(meta.type ?? "Intervention"),
        watershedId: i.watershed_id || "",
        watershedName: i.watersheds?.name || "",
        district: districtName,
        block: blockName,
        village: villageName,
        latitude: lat,
        longitude: lng,
        implementationDate: i.completion_date || i.start_date || meta.implementation_date || "",
        status: i.status || "PLANNED",
        imageCount: 0
      }
    })
  } catch {
    return []
  }
}

export async function fetchInterventionFeatureCollection(watershedId?: string): Promise<MapFeatureCollection> {
  const emptyCollection: MapFeatureCollection = {
    type: "FeatureCollection",
    features: []
  }

  const supabase = getSupabaseClient()
  if (!supabase) return emptyCollection

  try {
    const { data, error } = await supabase.rpc(
      "get_intervention_feature_collection",
      watershedId ? { target_watershed_id: watershedId } : {}
    )

    if (!error && data && typeof data === "object" && data.type === "FeatureCollection" && Array.isArray(data.features)) {
      return data as MapFeatureCollection
    }
  } catch {
    // Fall back to direct query
  }

  try {
    let query = supabase
      .from("interventions")
      .select("id, code, name, type, status, latitude, longitude, watershed_id, start_date, completion_date")
      .not("location", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000)

    if (watershedId) {
      query = query.eq("watershed_id", watershedId)
    }

    const { data, error } = await query
    if (error || !Array.isArray(data) || data.length === 0) {
      return emptyCollection
    }

    return {
      type: "FeatureCollection",
      features: data
        .filter(item => item.latitude !== null && item.longitude !== null)
        .map(item => ({
          type: "Feature" as const,
          id: item.id,
          geometry: {
            type: "Point" as const,
            coordinates: [Number(item.longitude), Number(item.latitude)]
          },
          properties: {
            layerId: "interventions" as const,
            code: item.code || `INT-${String(item.id).slice(0, 8).toUpperCase()}`,
            name: item.name,
            title: item.name,
            type: item.type || "Intervention",
            status: item.status,
            district: "",
            block: "",
            village: "",
            watershed: "",
            intervention_id: item.id,
            watershed_id: item.watershed_id,
            start_date: item.start_date,
            completion_date: item.completion_date,
            implementation_date: item.completion_date || item.start_date
          }
        }))
    }
  } catch {
    return emptyCollection
  }
}

export async function createIntervention(payload: Partial<InterventionItem> & { villageId?: string }): Promise<{ success: boolean; id?: string }> {
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
      const code = payload.interventionCode || `INT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
      const name = `${payload.type ?? "Intervention"} - ${code}`
      const hasCoords = typeof payload.latitude === "number" && typeof payload.longitude === "number"

      const insertRecord: Record<string, unknown> = {
        code,
        name,
        watershed_id: payload.watershedId,
        type: payload.type ?? "Other",
        status: payload.status ?? "PLANNED",
        metadata: {
          type: payload.type,
          district: payload.district,
          block: payload.block,
          village: payload.village,
          latitude: payload.latitude,
          longitude: payload.longitude,
          implementation_date: payload.implementationDate
        }
      }

      if (payload.villageId) insertRecord.village_id = payload.villageId
      if (payload.implementationDate) {
        insertRecord.start_date = payload.implementationDate
        if (payload.status === "COMPLETED") {
          insertRecord.completion_date = payload.implementationDate
        }
      }
      if (hasCoords) {
        insertRecord.latitude = payload.latitude
        insertRecord.longitude = payload.longitude
        insertRecord.location = `SRID=4326;POINT(${payload.longitude} ${payload.latitude})`
      }

      const { data, error } = await supabase
        .from("interventions")
        .insert(insertRecord)
        .select("id")
        .single()

      if (!error && data) return { success: true, id: data.id }
    } catch {
      // Supabase insert error
    }
  }

  return { success: false }
}
