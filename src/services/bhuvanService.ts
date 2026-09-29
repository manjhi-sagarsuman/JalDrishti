/**
 * JalDrishti Bhuvan GIS Integration Service
 * Secure client-side service communicating ONLY with server-side Bhuvan proxy.
 * NEVER exposes or embeds access tokens in frontend code.
 */

export const BHUVAN_ATTRIBUTION = "Data & Satellite Layers © ISRO / NRSC / Bhuvan, Government of India"

export type BhuvanWmsLayer =
  | "lulc:lulc_50k"
  | "lulc:lulc_250k"
  | "drainage:drainage_network"
  | "water_bodies:water_bodies_50k"
  | "bhuvan:india_satellite"
  | "bhuvan:terrain"

export interface VillageGeocodeResult {
  villageName: string
  villageCode?: string
  districtName?: string
  stateName?: string
  latitude: number
  longitude: number
  formattedAddress?: string
  source: "ISRO_BHUVAN"
}

export interface ReverseGeocodeResult {
  village?: string
  subDistrict?: string
  district?: string
  state?: string
  pincode?: string
  latitude: number
  longitude: number
  source: "ISRO_BHUVAN"
}

function getSupabaseFunctionUrl(endpoint: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ""
  if (!supabaseUrl) return `/functions/v1/bhuvan-proxy/${endpoint}`
  return `${supabaseUrl.replace(/\/$/, "")}/functions/v1/bhuvan-proxy/${endpoint}`
}

function getHeaders(): HeadersInit {
  const publishableKey = (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
  )?.trim()
  return {
    "Content-Type": "application/json",
    ...(publishableKey ? { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` } : {}),
  }
}

export function getBhuvanWmsTileUrlTemplate(layer: BhuvanWmsLayer): string {
  const baseUrl = getSupabaseFunctionUrl("wms")
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: layer,
    STYLES: "",
    FORMAT: "image/png",
    TRANSPARENT: "TRUE",
    CRS: "EPSG:3857",
    WIDTH: "256",
    HEIGHT: "256",
  })
  return `${baseUrl}?${params.toString()}&BBOX={bbox-epsg-3857}`
}

export async function geocodeVillageWithBhuvan(
  query: string,
  state = "Maharashtra",
  district = "Pune"
): Promise<VillageGeocodeResult[]> {
  if (!query || !query.trim()) return []

  const url = new URL(getSupabaseFunctionUrl("geocode"))
  url.searchParams.set("query", query.trim())
  if (state) url.searchParams.set("state", state)
  if (district) url.searchParams.set("district", district)

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(),
    })

    if (!res.ok) return []

    const data = await res.json()
    if (!Array.isArray(data?.results) && !Array.isArray(data)) return []

    const items = Array.isArray(data?.results) ? data.results : data
    return items
      .map((item: Record<string, unknown>) => {
        const lat = Number(item.lat ?? item.latitude)
        const lon = Number(item.lon ?? item.longitude ?? item.lng)
        if (Number.isNaN(lat) || Number.isNaN(lon)) return null
        return {
          villageName: String(item.village_name ?? item.village ?? query),
          villageCode: item.village_code ? String(item.village_code) : undefined,
          districtName: item.district ? String(item.district) : district,
          stateName: item.state ? String(item.state) : state,
          latitude: lat,
          longitude: lon,
          formattedAddress: item.address ? String(item.address) : undefined,
          source: "ISRO_BHUVAN" as const,
        }
      })
      .filter((v: VillageGeocodeResult | null): v is VillageGeocodeResult => v !== null)
  } catch {
    return []
  }
}

export async function reverseGeocodeWithBhuvan(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  const url = new URL(getSupabaseFunctionUrl("reverse-geocode"))
  url.searchParams.set("lat", latitude.toString())
  url.searchParams.set("lon", longitude.toString())

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: getHeaders(),
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data || typeof data !== "object") return null

    return {
      village: data.village ?? data.village_name,
      subDistrict: data.sub_district ?? data.block,
      district: data.district,
      state: data.state,
      pincode: data.pincode,
      latitude,
      longitude,
      source: "ISRO_BHUVAN",
    }
  } catch {
    return null
  }
}
