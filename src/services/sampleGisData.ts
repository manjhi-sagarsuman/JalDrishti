/**
 * Separated development sample data for JalDrishti GIS.
 * Explicitly flagged as DEMO_DATA = true.
 * Used only as a fallback when real API/Supabase data is unconfigured or returns empty.
 */
import type { FeatureCollection, Geometry } from "geojson"

export const DEMO_DATA = true

export interface SampleAdministrativeEntity {
  id: string
  name: string
  code: string
  type: "state" | "district" | "block" | "village"
  stateName: string
  districtName?: string
  blockName?: string
  center: [number, number] // [lng, lat]
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

export const SAMPLE_ADMINISTRATIVE_DATA: SampleAdministrativeEntity[] = [
  { id: "adm-st-1", name: "Maharashtra", code: "MH", type: "state", stateName: "Maharashtra", center: [75.7139, 19.7515] },
  { id: "adm-dt-1", name: "Ahmednagar", code: "AHM", type: "district", stateName: "Maharashtra", districtName: "Ahmednagar", center: [74.7496, 19.0948] },
  { id: "adm-dt-2", name: "Pune", code: "PUN", type: "district", stateName: "Maharashtra", districtName: "Pune", center: [73.8567, 18.5204] },
  { id: "adm-dt-3", name: "Solapur", code: "SOL", type: "district", stateName: "Maharashtra", districtName: "Solapur", center: [75.9064, 17.6599] },
  { id: "adm-bk-1", name: "Parner", code: "PAR", type: "block", stateName: "Maharashtra", districtName: "Ahmednagar", blockName: "Parner", center: [74.4418, 19.0028] },
  { id: "adm-bk-2", name: "Haveli", code: "HAV", type: "block", stateName: "Maharashtra", districtName: "Pune", blockName: "Haveli", center: [73.9211, 18.4901] },
  { id: "adm-vg-1", name: "Ralegan Siddhi", code: "RLG", type: "village", stateName: "Maharashtra", districtName: "Ahmednagar", blockName: "Parner", center: [74.4367, 19.0223] },
  { id: "adm-vg-2", name: "Hivre Bazar", code: "HVR", type: "village", stateName: "Maharashtra", districtName: "Ahmednagar", blockName: "Parner", center: [74.4921, 19.0435] },
  { id: "adm-vg-3", name: "Purandar", code: "PUR", type: "village", stateName: "Maharashtra", districtName: "Pune", blockName: "Haveli", center: [73.9812, 18.3142] }
]

export const SAMPLE_WATERSHEDS: SampleWatershed[] = [
  {
    id: "ws-ahm-01",
    code: "WS-MH-AHM-001",
    name: "Ralegan Upper Catchment",
    state: "Maharashtra",
    district: "Ahmednagar",
    block: "Parner",
    villagesCount: 4,
    areaHectares: 1240,
    interventionsCount: 38,
    status: "ACTIVE",
    coordinates: [74.4367, 19.0223]
  },
  {
    id: "ws-ahm-02",
    code: "WS-MH-AHM-002",
    name: "Hivre Micro-Watershed A",
    state: "Maharashtra",
    district: "Ahmednagar",
    block: "Parner",
    villagesCount: 3,
    areaHectares: 980,
    interventionsCount: 29,
    status: "COMPLETED",
    coordinates: [74.4921, 19.0435]
  },
  {
    id: "ws-pun-01",
    code: "WS-MH-PUN-001",
    name: "Purandar Karha Basin",
    state: "Maharashtra",
    district: "Pune",
    block: "Haveli",
    villagesCount: 6,
    areaHectares: 2150,
    interventionsCount: 52,
    status: "ACTIVE",
    coordinates: [73.9812, 18.3142]
  }
]

export const SAMPLE_INTERVENTIONS: SampleIntervention[] = [
  {
    id: "int-001",
    interventionCode: "CD-RLG-01",
    type: "Check Dam",
    watershedId: "ws-ahm-01",
    watershedName: "Ralegan Upper Catchment",
    district: "Ahmednagar",
    block: "Parner",
    village: "Ralegan Siddhi",
    latitude: 19.0245,
    longitude: 74.4382,
    implementationDate: "2024-11-15",
    status: "COMPLETED",
    imageCount: 4
  },
  {
    id: "int-002",
    interventionCode: "FP-RLG-04",
    type: "Farm Pond",
    watershedId: "ws-ahm-01",
    watershedName: "Ralegan Upper Catchment",
    district: "Ahmednagar",
    block: "Parner",
    village: "Ralegan Siddhi",
    latitude: 19.0211,
    longitude: 74.4329,
    implementationDate: "2025-02-20",
    status: "COMPLETED",
    imageCount: 2
  },
  {
    id: "int-003",
    interventionCode: "PT-HVR-02",
    type: "Percolation Tank",
    watershedId: "ws-ahm-02",
    watershedName: "Hivre Micro-Watershed A",
    district: "Ahmednagar",
    block: "Parner",
    village: "Hivre Bazar",
    latitude: 19.0456,
    longitude: 74.4944,
    implementationDate: "2025-01-10",
    status: "COMPLETED",
    imageCount: 5
  },
  {
    id: "int-004",
    interventionCode: "CT-HVR-07",
    type: "Contour Trench",
    watershedId: "ws-ahm-02",
    watershedName: "Hivre Micro-Watershed A",
    district: "Ahmednagar",
    block: "Parner",
    village: "Hivre Bazar",
    latitude: 19.0418,
    longitude: 74.4892,
    implementationDate: "2025-05-18",
    status: "UNDER_CONSTRUCTION",
    imageCount: 3
  },
  {
    id: "int-005",
    interventionCode: "PL-PUR-01",
    type: "Plantation",
    watershedId: "ws-pun-01",
    watershedName: "Purandar Karha Basin",
    district: "Pune",
    block: "Haveli",
    village: "Purandar",
    latitude: 18.3188,
    longitude: 73.9845,
    implementationDate: "2025-07-22",
    status: "COMPLETED",
    imageCount: 6
  },
  {
    id: "int-006",
    interventionCode: "RS-PUR-03",
    type: "Recharge Structure",
    watershedId: "ws-pun-01",
    watershedName: "Purandar Karha Basin",
    district: "Pune",
    block: "Haveli",
    village: "Purandar",
    latitude: 18.3112,
    longitude: 73.9789,
    implementationDate: "2025-08-30",
    status: "SANCTIONED",
    imageCount: 1
  }
]

export const SAMPLE_EVIDENCE: SampleEvidence[] = [
  {
    id: "ev-001",
    title: "Check Dam Masonry Inspection",
    description: "Post-monsoon water retention at spillway wall with no structural seepage observed.",
    category: "Water Structure",
    watershedId: "ws-ahm-01",
    watershedName: "Ralegan Upper Catchment",
    interventionId: "int-001",
    interventionName: "Check Dam (CD-RLG-01)",
    district: "Ahmednagar",
    block: "Parner",
    village: "Ralegan Siddhi",
    latitude: 19.0245,
    longitude: 74.4382,
    imageUrl: "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=300&q=80",
    uploadedBy: "A. Patil (Field Engineer)",
    uploadedAt: "2025-10-12T10:30:00Z",
    verificationStatus: "VERIFIED"
  },
  {
    id: "ev-002",
    title: "Farm Pond Storage Depth Check",
    description: "Geomembrane-lined farm pond storing approximately 1,800 cu.m for protective rabi irrigation.",
    category: "Farm Pond",
    watershedId: "ws-ahm-01",
    watershedName: "Ralegan Upper Catchment",
    interventionId: "int-002",
    interventionName: "Farm Pond (FP-RLG-04)",
    district: "Ahmednagar",
    block: "Parner",
    village: "Ralegan Siddhi",
    latitude: 19.0211,
    longitude: 74.4329,
    imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=300&q=80",
    uploadedBy: "M. Shinde (Surveyor)",
    uploadedAt: "2025-10-14T08:15:00Z",
    verificationStatus: "VERIFIED"
  },
  {
    id: "ev-003",
    title: "Percolation Tank Infiltration Basin",
    description: "Desilted storage bowl allowing groundwater recharge into adjoining borewells.",
    category: "Percolation Tank",
    watershedId: "ws-ahm-02",
    watershedName: "Hivre Micro-Watershed A",
    interventionId: "int-003",
    interventionName: "Percolation Tank (PT-HVR-02)",
    district: "Ahmednagar",
    block: "Parner",
    village: "Hivre Bazar",
    latitude: 19.0456,
    longitude: 74.4944,
    imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=300&q=80",
    uploadedBy: "S. Kulkarni (WDT Member)",
    uploadedAt: "2025-10-18T14:45:00Z",
    verificationStatus: "VERIFIED"
  },
  {
    id: "ev-004",
    title: "Continuous Contour Trenches Ridge Line",
    description: "Trenches excavated on 8% slope catching surface runoff and arresting topsoil erosion.",
    category: "Contour Trench",
    watershedId: "ws-ahm-02",
    watershedName: "Hivre Micro-Watershed A",
    interventionId: "int-004",
    interventionName: "Contour Trench (CT-HVR-07)",
    district: "Ahmednagar",
    block: "Parner",
    village: "Hivre Bazar",
    latitude: 19.0418,
    longitude: 74.4892,
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=300&q=80",
    uploadedBy: "V. Gaikwad (Agri Assistant)",
    uploadedAt: "2025-11-02T11:20:00Z",
    verificationStatus: "PENDING"
  },
  {
    id: "ev-005",
    title: "Afforestation Ridge Plantation",
    description: "Sapling survival rate checked at 84% along ridge boundary afforestation corridor.",
    category: "Plantation",
    watershedId: "ws-pun-01",
    watershedName: "Purandar Karha Basin",
    interventionId: "int-005",
    interventionName: "Plantation (PL-PUR-01)",
    district: "Pune",
    block: "Haveli",
    village: "Purandar",
    latitude: 18.3188,
    longitude: 73.9845,
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=300&q=80",
    uploadedBy: "P. Deshmukh (Range Officer)",
    uploadedAt: "2025-11-05T09:00:00Z",
    verificationStatus: "VERIFIED"
  }
]

export function getSampleGisFeatureCollection(): FeatureCollection<Geometry, Record<string, unknown>> {
  const features: any[] = []

  // Add watershed boundary polygons
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
          [lng - delta, lat - delta]
        ]]
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
        status: ws.status
      }
    })
  })

  // Add interventions points
  SAMPLE_INTERVENTIONS.forEach((item) => {
    let layerId = "interventions"
    if (item.type === "Check Dam") layerId = "intervention-check-dam"
    else if (item.type === "Farm Pond") layerId = "intervention-farm-pond"
    else if (item.type === "Percolation Tank") layerId = "intervention-percolation-tank"
    else if (item.type === "Recharge Structure") layerId = "intervention-recharge-structure"
    else if (item.type === "Contour Trench") layerId = "intervention-contour-trench"
    else if (item.type === "Plantation") layerId = "intervention-plantation"

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [item.longitude, item.latitude]
      },
      properties: {
        id: item.id,
        name: `${item.type} (${item.interventionCode})`,
        title: `${item.type} (${item.interventionCode})`,
        layerId,
        type: item.type,
        intervention_code: item.interventionCode,
        watershed_name: item.watershedName,
        district: item.district,
        block: item.block,
        village: item.village,
        implementation_date: item.implementationDate,
        status: item.status,
        image_count: item.imageCount
      }
    })
  })

  // Add geo-tagged evidence points
  SAMPLE_EVIDENCE.forEach((ev) => {
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [ev.longitude, ev.latitude]
      },
      properties: {
        id: ev.id,
        name: ev.title,
        title: ev.title,
        layerId: "geo-tagged-photos",
        category: ev.category,
        description: ev.description,
        watershed_name: ev.watershedName,
        intervention_name: ev.interventionName ?? "None",
        district: ev.district,
        block: ev.block,
        village: ev.village,
        date: ev.uploadedAt.split("T")[0],
        uploaded_by: ev.uploadedBy,
        verification_status: ev.verificationStatus,
        thumbnail_url: ev.thumbnailUrl,
        image_url: ev.imageUrl
      }
    })
  })

  return {
    type: "FeatureCollection",
    features
  }
}
