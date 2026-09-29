export type MapLayerId =
  // Administrative
  | "state-boundary"
  | "district-boundary"
  | "block-boundary"
  | "village-boundary"
  // Watershed
  | "watershed-boundary"
  | "sub-watersheds"
  | "drainage-network"
  | "rivers-network"
  | "streams-network"
  // Interventions
  | "interventions"
  | "intervention-check-dam"
  | "intervention-farm-pond"
  | "intervention-percolation-tank"
  | "intervention-recharge-structure"
  | "intervention-contour-trench"
  | "intervention-plantation"
  | "intervention-other"
  // Evidence
  | "geo-tagged-photos"
  | "field-verification-points"
  | "inspection-points"
  // Hydrology & Thematic & Change
  | "water-bodies"
  | "vegetation-ndvi"
  | "water-index"
  | "land-use-land-cover"
  | "vegetation-change"
  | "water-change"
  | "satellite-scenes"

export type MapLayerCategory = "ADMINISTRATIVE" | "WATERSHED" | "INTERVENTIONS" | "EVIDENCE" | "THEMATIC" | "CHANGE"

export interface MapLayerDefinition {
  id: MapLayerId
  category: MapLayerCategory
  label: string
  color: string
  defaultVisible?: boolean
  hasOpacity?: boolean
}

export const mapLayers: readonly MapLayerDefinition[] = [
  // Administrative
  { id: "state-boundary", category: "ADMINISTRATIVE", label: "State Boundary", color: "#1e293b", defaultVisible: false },
  { id: "district-boundary", category: "ADMINISTRATIVE", label: "District Boundaries", color: "#0f766e", defaultVisible: true },
  { id: "block-boundary", category: "ADMINISTRATIVE", label: "Block Boundaries", color: "#0891b2", defaultVisible: true },
  { id: "village-boundary", category: "ADMINISTRATIVE", label: "Village Boundaries", color: "#64748b", defaultVisible: false },

  // Watershed
  { id: "watershed-boundary", category: "WATERSHED", label: "Watershed Boundary", color: "#1670a8", defaultVisible: true },
  { id: "sub-watersheds", category: "WATERSHED", label: "Sub-watersheds", color: "#378b5c", defaultVisible: true },
  { id: "drainage-network", category: "WATERSHED", label: "Drainage Network", color: "#0284c7", defaultVisible: false },
  { id: "rivers-network", category: "WATERSHED", label: "Rivers", color: "#0369a1", defaultVisible: false },
  { id: "streams-network", category: "WATERSHED", label: "Streams", color: "#38bdf8", defaultVisible: false },

  // Interventions
  { id: "interventions", category: "INTERVENTIONS", label: "All Interventions", color: "#7c3aed", defaultVisible: false },
  { id: "intervention-check-dam", category: "INTERVENTIONS", label: "Check Dams", color: "#9333ea", defaultVisible: true },
  { id: "intervention-farm-pond", category: "INTERVENTIONS", label: "Farm Ponds", color: "#2563eb", defaultVisible: true },
  { id: "intervention-percolation-tank", category: "INTERVENTIONS", label: "Percolation Tanks", color: "#0d9488", defaultVisible: true },
  { id: "intervention-recharge-structure", category: "INTERVENTIONS", label: "Recharge Structures", color: "#4f46e5", defaultVisible: false },
  { id: "intervention-contour-trench", category: "INTERVENTIONS", label: "Contour Trenches", color: "#d97706", defaultVisible: false },
  { id: "intervention-plantation", category: "INTERVENTIONS", label: "Plantation / Afforestation", color: "#15803d", defaultVisible: true },
  { id: "intervention-other", category: "INTERVENTIONS", label: "Other Interventions", color: "#6b7280", defaultVisible: false },

  // Evidence
  { id: "geo-tagged-photos", category: "EVIDENCE", label: "Geo-tagged Photos", color: "#ea580c", defaultVisible: true },
  { id: "field-verification-points", category: "EVIDENCE", label: "Field Verification Points", color: "#10b981", defaultVisible: false },
  { id: "inspection-points", category: "EVIDENCE", label: "Inspection Points", color: "#f59e0b", defaultVisible: false },

  // Thematic & Hydrology
  { id: "water-bodies", category: "THEMATIC", label: "Water Bodies", color: "#1d4ed8", defaultVisible: false, hasOpacity: true },
  { id: "vegetation-ndvi", category: "THEMATIC", label: "Vegetation / NDVI", color: "#33864b", defaultVisible: false, hasOpacity: true },
  { id: "water-index", category: "THEMATIC", label: "Water Index (NDWI)", color: "#0e7490", defaultVisible: false, hasOpacity: true },
  { id: "land-use-land-cover", category: "THEMATIC", label: "Land Use / Land Cover", color: "#a16207", defaultVisible: false, hasOpacity: true },
  { id: "satellite-scenes", category: "THEMATIC", label: "Satellite Footprints", color: "#475569", defaultVisible: false },

  // Change
  { id: "vegetation-change", category: "CHANGE", label: "Vegetation Change", color: "#65a30d", defaultVisible: false, hasOpacity: true },
  { id: "water-change", category: "CHANGE", label: "Water Body Change", color: "#0284c7", defaultVisible: false, hasOpacity: true }
]

export const defaultVisibleLayers: readonly MapLayerId[] = mapLayers
  .filter((layer) => layer.defaultVisible)
  .map((layer) => layer.id)
