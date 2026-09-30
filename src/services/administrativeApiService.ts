import { apiRequest, isApiConfigured } from "./apiClient"
import { getSupabaseClient } from "../lib/supabase"
import type { MapFeatureCollection } from "../maps"

export interface AdministrativeEntity {
  id: string
  code: string
  name: string
  type: "state" | "district" | "block" | "village"
  stateName: string
  districtName?: string
  blockName?: string
  districtId?: string
  blockId?: string
  latitude?: number
  longitude?: number
}

const emptyFeatureCollection: MapFeatureCollection = {
  type: "FeatureCollection",
  features: [],
}

/**
 * Fetch districts from configured API or real Supabase database.
 */
export async function fetchDistricts(): Promise<AdministrativeEntity[]> {
  if (isApiConfigured()) {
    try {
      const data = await apiRequest<AdministrativeEntity[]>("/map/districts")
      if (Array.isArray(data)) return data
    } catch {
      // API unavailable, fall back to Supabase
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("districts")
        .select("id, code, name, state_id, states(name)")
        .order("name", { ascending: true })

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.id,
          code: d.code,
          name: d.name,
          type: "district",
          stateName: d.states?.name ?? "Maharashtra",
        }))
      }
    } catch {
      // Supabase query error
    }
  }

  return []
}

/**
 * Fetch blocks (talukas) filtered by district ID.
 */
export async function fetchBlocks(districtId?: string): Promise<AdministrativeEntity[]> {
  if (isApiConfigured()) {
    try {
      const query = districtId ? `?districtId=${encodeURIComponent(districtId)}` : ""
      const data = await apiRequest<AdministrativeEntity[]>(`/map/blocks${query}`)
      if (Array.isArray(data)) return data
    } catch {
      // API unavailable, fall back to Supabase
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      let query = supabase
        .from("blocks")
        .select("id, code, name, district_id, districts(name, states(name))")
        .order("name", { ascending: true })

      if (districtId) {
        query = query.eq("district_id", districtId)
      }

      const { data, error } = await query
      if (!error && Array.isArray(data)) {
        return data.map((b: any) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          type: "block",
          districtId: b.district_id,
          districtName: b.districts?.name ?? "Pune",
          stateName: b.districts?.states?.name ?? "Maharashtra",
        }))
      }
    } catch {
      // Supabase query error
    }
  }

  return []
}

/**
 * Fetch villages filtered by block ID.
 */
export async function fetchVillages(blockId?: string): Promise<AdministrativeEntity[]> {
  if (isApiConfigured()) {
    try {
      const query = blockId ? `?blockId=${encodeURIComponent(blockId)}` : ""
      const data = await apiRequest<AdministrativeEntity[]>(`/map/villages${query}`)
      if (Array.isArray(data)) return data
    } catch {
      // API unavailable, fall back to Supabase
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      let query = supabase
        .from("villages")
        .select("id, code, name, block_id, latitude, longitude, blocks(name, districts(name, states(name)))")
        .order("name", { ascending: true })

      if (blockId) {
        query = query.eq("block_id", blockId)
      }

      const { data, error } = await query
      if (!error && Array.isArray(data)) {
        return data.map((v: any) => ({
          id: v.id,
          code: v.code,
          name: v.name,
          type: "village",
          blockId: v.block_id,
          blockName: v.blocks?.name,
          districtName: v.blocks?.districts?.name ?? "Pune",
          stateName: v.blocks?.districts?.states?.name ?? "Maharashtra",
          latitude: v.latitude != null ? Number(v.latitude) : undefined,
          longitude: v.longitude != null ? Number(v.longitude) : undefined,
        }))
      }
    } catch {
      // Supabase query error
    }
  }

  return []
}

/**
 * Fetch administrative GeoJSON boundaries with required MapLibre layerId properties.
 * layerId output: 'district-boundary' | 'block-boundary' | 'village-boundary'
 */
export async function fetchAdministrativeGeoJson(
  layer: "district-boundary" | "block-boundary" | "village-boundary",
  parentId?: string
): Promise<MapFeatureCollection> {
  const supabase = getSupabaseClient()

  // 1. Try Supabase RPC get_administrative_feature_collection
  if (supabase) {
    try {
      const { data, error } = await supabase.rpc("get_administrative_feature_collection", {
        target_layer: layer,
        target_parent_id: parentId ?? null,
      })
      if (!error && data && data.type === "FeatureCollection" && Array.isArray(data.features)) {
        return data as MapFeatureCollection
      }
    } catch {
      // RPC not yet deployed or error, try direct table select
    }

    // 2. Fallback to direct PostGIS table selection
    try {
      const tableName = layer === "district-boundary" ? "districts" : layer === "block-boundary" ? "blocks" : "villages"
      const parentCol = layer === "block-boundary" ? "district_id" : layer === "village-boundary" ? "block_id" : "state_id"

      let query = supabase
        .from(tableName)
        .select("id, code, name, geom, boundary" + (layer === "village-boundary" ? ", latitude, longitude, block_id" : layer === "block-boundary" ? ", district_id" : ", state_id"))

      if (parentId) {
        query = query.eq(parentCol, parentId)
      }

      const { data, error } = await query
      if (!error && Array.isArray(data)) {
        const features = data
          .map((item: any) => {
            const rawGeom = item.geom || item.boundary
            if (!rawGeom) return null
            const geometry = typeof rawGeom === "string" ? (() => { try { return JSON.parse(rawGeom) } catch { return null } })() : rawGeom
            if (!geometry) return null

            return {
              type: "Feature" as const,
              id: item.id,
              geometry,
              properties: {
                layerId: layer,
                id: item.id,
                code: item.code,
                name: item.name,
                title: item.name,
                ...(layer === "village-boundary" ? { block_id: item.block_id, latitude: item.latitude, longitude: item.longitude } : {}),
                ...(layer === "block-boundary" ? { district_id: item.district_id } : {}),
                ...(layer === "district-boundary" ? { state_id: item.state_id } : {}),
              },
            }
          })
          .filter(Boolean)

        return {
          type: "FeatureCollection",
          features: features as any,
        }
      }
    } catch {
      // direct query error
    }
  }

  // 3. Fallback to centralized API if configured
  if (isApiConfigured()) {
    try {
      const apiEndpoint = layer === "district-boundary" ? "/map/districts" : layer === "block-boundary" ? "/map/blocks" : "/map/villages"
      const queryParam = parentId ? `?parentId=${encodeURIComponent(parentId)}` : ""
      const data = await apiRequest<MapFeatureCollection>(`${apiEndpoint}${queryParam}`)
      if (data && data.type === "FeatureCollection") return data
    } catch {
      // API unavailable
    }
  }

  return emptyFeatureCollection
}

export async function fetchDistrictBoundaries(): Promise<MapFeatureCollection> {
  return fetchAdministrativeGeoJson("district-boundary")
}

export async function fetchBlockBoundaries(districtId?: string): Promise<MapFeatureCollection> {
  return fetchAdministrativeGeoJson("block-boundary", districtId)
}

export async function fetchVillageBoundaries(blockId?: string): Promise<MapFeatureCollection> {
  return fetchAdministrativeGeoJson("village-boundary", blockId)
}
