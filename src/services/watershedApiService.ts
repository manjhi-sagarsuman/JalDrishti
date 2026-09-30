import { apiRequest, isApiConfigured } from "./apiClient"
import { getSupabaseClient } from "../lib/supabase"
import type { MapFeatureCollection } from "../maps"

export interface WatershedItem {
  id: string
  code: string
  name: string
  state: string
  district: string
  block: string
  village?: string
  villagesCount: number
  areaHectares: number
  areaKm2: number
  interventionsCount: number
  status: "ACTIVE" | "COMPLETED" | "PROPOSED" | "PLANNED" | "ARCHIVED" | string
  centroidLatitude?: number | null
  centroidLongitude?: number | null
  source?: string | null
  provenance?: Record<string, unknown> | null
}

export interface WatershedFilters {
  stateId?: string
  districtId?: string
  blockId?: string
  villageId?: string
  search?: string
}

const emptyFeatureCollection: MapFeatureCollection = {
  type: "FeatureCollection",
  features: []
}

export async function fetchWatersheds(filters?: WatershedFilters): Promise<WatershedItem[]> {
  if (isApiConfigured()) {
    try {
      const data = await apiRequest<WatershedItem[]>("/map/watersheds")
      if (Array.isArray(data)) return data
    } catch {
      // API fallback to direct Supabase client
    }
  }

  const supabase = getSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase
      .from("watersheds")
      .select(`
        id,
        code,
        name,
        watershed_code,
        watershed_name,
        linked_village_code,
        area_km2,
        area_sq_km,
        centroid_latitude,
        centroid_longitude,
        status,
        district_id,
        village_id,
        source,
        provenance,
        metadata
      `)
      .order("name", { ascending: true })

    if (filters?.districtId) {
      query = query.eq("district_id", filters.districtId)
    }
    if (filters?.villageId) {
      query = query.eq("village_id", filters.villageId)
    }

    const { data, error } = await query
    if (error || !Array.isArray(data)) return []

    return data.map((w: any) => {
      const metadata = (w.metadata ?? {}) as Record<string, unknown>
      const areaKm2Val = Number(w.area_km2 ?? w.area_sq_km ?? metadata.area_km2 ?? 0)
      const areaHa = areaKm2Val > 0 ? Math.round(areaKm2Val * 100) : Number(metadata.area_ha ?? 0)

      return {
        id: String(w.id),
        code: String(w.watershed_code ?? w.code ?? ""),
        name: String(w.watershed_name ?? w.name ?? ""),
        state: String(metadata.state ?? ""),
        district: String(metadata.district ?? ""),
        block: String(metadata.block ?? ""),
        village: String(metadata.village ?? ""),
        villagesCount: Number(metadata.villages_count ?? 1),
        areaHectares: areaHa,
        areaKm2: areaKm2Val,
        interventionsCount: Number(metadata.interventions_count ?? 0),
        status: String(w.status ?? "ACTIVE"),
        centroidLatitude: w.centroid_latitude !== null && w.centroid_latitude !== undefined ? Number(w.centroid_latitude) : null,
        centroidLongitude: w.centroid_longitude !== null && w.centroid_longitude !== undefined ? Number(w.centroid_longitude) : null,
        source: w.source ?? null,
        provenance: w.provenance ?? null,
      }
    })
  } catch {
    return []
  }
}

export async function fetchWatershedExplorerFeatureCollection(): Promise<MapFeatureCollection> {
  const supabase = getSupabaseClient()
  if (!supabase) return emptyFeatureCollection

  try {
    const { data, error } = await supabase.rpc("get_watershed_explorer_feature_collection")
    if (!error && data && typeof data === "object" && (data as any).type === "FeatureCollection") {
      const fc = data as MapFeatureCollection
      if (Array.isArray(fc.features)) return fc
    }
  } catch {
    // RPC unavailable or failed
  }

  return emptyFeatureCollection
}
