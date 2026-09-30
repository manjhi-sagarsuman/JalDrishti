/**
 * JalDrishti Development Sample GIS Data.
 *
 * IMPORTANT RULES FOR PRODUCTION:
 * - This file is strictly for isolated local development and testing.
 * - DEMO_DATA is explicitly flagged as true.
 * - Production builds and runtimes MUST NEVER use or display this demo data.
 * - Real API data exists -> display real data.
 * - Real API returns zero records -> display empty state.
 * - Real API fails -> display error state.
 */

import type { FeatureCollection, Geometry } from "geojson"

/**
 * Explicit indicator that records in this module are synthetic development mocks.
 */
export const DEMO_DATA = true

/**
 * Safety check: returns true only in explicit development/test environments
 * where demo data is deliberately enabled via VITE_ENABLE_DEMO_DATA=true.
 * In production builds (import.meta.env.PROD === true), this ALWAYS returns false.
 */
export function isDemoDataAllowed(): boolean {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    if (import.meta.env.PROD) {
      return false
    }
    return import.meta.env.VITE_ENABLE_DEMO_DATA === "true"
  }
  return false
}

export interface SampleAdministrativeEntity {
  id: string
  name: string
  code: string
  type: "state" | "district" | "block" | "village"
  stateName: string
  districtName?: string
  blockName?: string
  center: [number, number]
}

export interface SampleWatershed {
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

export interface SampleIntervention {
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

export interface SampleEvidence {
  id: string
  title: string
  description: string
  category: string
  watershedId: string
  watershedName: string
  interventionId: string | null
  interventionName: string | null
  district: string
  block: string
  village: string
  latitude: number
  longitude: number
  imageUrl: string
  thumbnailUrl: string
  uploadedBy: string
  uploadedAt: string
  verificationStatus: "VERIFIED" | "PENDING" | "REJECTED"
}

export const SAMPLE_ADMINISTRATIVE_DATA: readonly SampleAdministrativeEntity[] = [
  { id: "demo-adm-st-1", name: "Maharashtra", code: "MH", type: "state", stateName: "Maharashtra", center: [75.7139, 19.7515] },
  { id: "demo-adm-dt-1", name: "Ahmednagar", code: "AHM", type: "district", stateName: "Maharashtra", districtName: "Ahmednagar", center: [74.7496, 19.0948] },
  { id: "demo-adm-dt-2", name: "Pune", code: "PUN", type: "district", stateName: "Maharashtra", districtName: "Pune", center: [73.8567, 18.5204] },
  { id: "demo-adm-dt-3", name: "Solapur", code: "SOL", type: "district", stateName: "Maharashtra", districtName: "Solapur", center: [75.9064, 17.6599] },
  { id: "demo-adm-bk-1", name: "Parner", code: "PAR", type: "block", stateName: "Maharashtra", districtName: "Ahmednagar", blockName: "Parner", center: [74.4418, 19.0028] },
  { id: "demo-adm-bk-2", name: "Haveli", code: "HAV", type: "block", stateName: "Maharashtra", districtName: "Pune", blockName: "Haveli", center: [73.9211, 18.4901] },
  { id: "demo-adm-vg-1", name: "Ralegan Siddhi", code: "RLG", type: "village", stateName: "Maharashtra", districtName: "Ahmednagar", blockName: "Parner", center: [74.4367, 19.0223] },
  { id: "demo-adm-vg-2", name: "Hivre Bazar", code: "HVR", type: "village", stateName: "Maharashtra", districtName: "Ahmednagar", blockName: "Parner", center: [74.4921, 19.0435] },
  { id: "demo-adm-vg-3", name: "Purandar", code: "PUR", type: "village", stateName: "Maharashtra", districtName: "Pune", blockName: "Haveli", center: [73.9812, 18.3142] },
] as const

export const SAMPLE_WATERSHEDS: readonly SampleWatershed[] = [
  {
    id: "demo-ws-ahm-01",
    code: "WS-MH-AHM-DEMO1",
    name: "Demo Catchment 1",
    state: "Maharashtra",
    district: "Ahmednagar",
    block: "Parner",
    villagesCount: 4,
    areaHectares: 1240,
    interventionsCount: 38,
    status: "ACTIVE",
    coordinates: [74.4367, 19.0223],
  },
  {
    id: "demo-ws-ahm-02",
    code: "WS-MH-AHM-DEMO2",
    name: "Demo Catchment 2",
    state: "Maharashtra",
    district: "Ahmednagar",
    block: "Parner",
    villagesCount: 3,
    areaHectares: 980,
    interventionsCount: 29,
    status: "COMPLETED",
    coordinates: [74.4921, 19.0435],
  },
  {
    id: "demo-ws-pun-01",
    code: "WS-MH-PUN-DEMO3",
    name: "Demo Catchment 3",
    state: "Maharashtra",
    district: "Pune",
    block: "Haveli",
    villagesCount: 6,
    areaHectares: 2150,
    interventionsCount: 52,
    status: "ACTIVE",
    coordinates: [73.9812, 18.3142],
  },
] as const

export const SAMPLE_INTERVENTIONS: readonly SampleIntervention[] = [
  {
    id: "demo-int-001",
    interventionCode: "DEMO-CD-01",
    type: "Check Dam",
    watershedId: "demo-ws-ahm-01",
    watershedName: "Demo Catchment 1",
    district: "Ahmednagar",
    block: "Parner",
    village: "Ralegan Siddhi",
    latitude: 19.0245,
    longitude: 74.4382,
    implementationDate: "2024-11-15",
    status: "COMPLETED",
    imageCount: 4,
  },
  {
    id: "demo-int-002",
    interventionCode: "DEMO-FP-02",
    type: "Farm Pond",
    watershedId: "demo-ws-ahm-01",
    watershedName: "Demo Catchment 1",
    district: "Ahmednagar",
    block: "Parner",
    village: "Ralegan Siddhi",
    latitude: 19.0211,
    longitude: 74.4329,
    implementationDate: "2025-02-20",
    status: "COMPLETED",
    imageCount: 2,
  },
] as const

export const SAMPLE_EVIDENCE: readonly SampleEvidence[] = [
  {
    id: "demo-ev-001",
    title: "Demo Masonry Check Dam",
    description: "Inspection observation for development testing only.",
    category: "Water Structure",
    watershedId: "demo-ws-ahm-01",
    watershedName: "Demo Catchment 1",
    interventionId: "demo-int-001",
    interventionName: "Check Dam (DEMO-CD-01)",
    district: "Ahmednagar",
    block: "Parner",
    village: "Ralegan Siddhi",
    latitude: 19.0245,
    longitude: 74.4382,
    imageUrl: "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=600&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=200&q=80",
    uploadedBy: "Demo Surveyor",
    uploadedAt: "2025-10-12T10:30:00Z",
    verificationStatus: "VERIFIED",
  },
] as const

/**
 * Returns sample GeoJSON feature collection for explicit development testing.
 * Throws in production or when VITE_ENABLE_DEMO_DATA is not enabled.
 */
export function getSampleGisFeatureCollection(): FeatureCollection<Geometry, Record<string, unknown>> {
  if (!isDemoDataAllowed()) {
    if (typeof import.meta !== "undefined" && import.meta.env?.PROD) {
      throw new Error(
        "CRITICAL: getSampleGisFeatureCollection called in PRODUCTION mode. Production builds must never use DEMO_DATA."
      )
    }
    // Return empty collection if not explicitly enabled
    return {
      type: "FeatureCollection",
      features: [],
    }
  }

  const features: any[] = []

  SAMPLE_WATERSHEDS.forEach((ws) => {
    const [lng, lat] = ws.coordinates
    const delta = 0.04
    features.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [lng - delta, lat - delta],
          [lng + delta, lat - delta],
          [lng + delta + 0.01, lat + delta * 0.8],
          [lng - delta * 0.5, lat + delta],
          [lng - delta, lat - delta],
        ]],
      },
      properties: {
        id: ws.id,
        name: ws.name,
        code: ws.code,
        layerId: "watershed-boundary",
        state: ws.state,
        district: ws.district,
        block: ws.block,
        area_ha: ws.areaHectares,
        interventions_count: ws.interventionsCount,
        status: ws.status,
        isDemo: true,
      },
    })
  })

  SAMPLE_INTERVENTIONS.forEach((item) => {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [item.longitude, item.latitude],
      },
      properties: {
        id: item.id,
        name: `${item.type} (${item.interventionCode})`,
        title: `${item.type} (${item.interventionCode})`,
        layerId: "interventions",
        type: item.type,
        intervention_code: item.interventionCode,
        watershed_name: item.watershedName,
        district: item.district,
        block: item.block,
        village: item.village,
        implementation_date: item.implementationDate,
        status: item.status,
        image_count: item.imageCount,
        isDemo: true,
      },
    })
  })

  return {
    type: "FeatureCollection",
    features,
  }
}
