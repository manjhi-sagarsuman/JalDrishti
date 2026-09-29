export type MapLayerId =
  | "district-boundary"
  | "block-boundary"
  | "village-boundary"
  | "watershed-boundary"
  | "sub-watersheds"
  | "geo-tagged-photos"
  | "interventions"
  | "drainage-network"
  | "water-bodies"
  | "vegetation-ndvi"
  | "water-index"
  | "land-use-land-cover"
  | "vegetation-change"
  | "water-change"
  | "satellite-scenes"

export interface MapLayerDefinition {
  id: MapLayerId
  category: "WATERSHED" | "FIELD EVIDENCE" | "HYDROLOGY" | "THEMATIC" | "CHANGE"
  label: string
  color: string
}

export const mapLayers: readonly MapLayerDefinition[] = [
  { id: "district-boundary", category: "WATERSHED", label: "District Boundaries", color: "#0f766e" },
  { id: "block-boundary", category: "WATERSHED", label: "Block Boundaries", color: "#0891b2" },
  { id: "village-boundary", category: "WATERSHED", label: "Village Boundaries", color: "#64748b" },
  { id: "watershed-boundary", category: "WATERSHED", label: "Watershed Boundary", color: "#1670a8" },
  { id: "sub-watersheds", category: "WATERSHED", label: "Sub-watersheds", color: "#378b5c" },
  { id: "geo-tagged-photos", category: "FIELD EVIDENCE", label: "Geo-tagged Photos", color: "#d97706" },
  { id: "interventions", category: "FIELD EVIDENCE", label: "Interventions", color: "#7c3aed" },
  { id: "drainage-network", category: "HYDROLOGY", label: "Drainage Network", color: "#1685a8" },
  { id: "water-bodies", category: "HYDROLOGY", label: "Water Bodies", color: "#2563eb" },
  { id: "vegetation-ndvi", category: "THEMATIC", label: "Vegetation / NDVI", color: "#33864b" },
  { id: "water-index", category: "THEMATIC", label: "Water Index", color: "#0e7490" },
  { id: "land-use-land-cover", category: "THEMATIC", label: "Land Use / Land Cover", color: "#a16207" },
  { id: "vegetation-change", category: "CHANGE", label: "Vegetation Change", color: "#65a30d" },
  { id: "water-change", category: "CHANGE", label: "Water Change", color: "#0284c7" },
  { id: "satellite-scenes", category: "THEMATIC", label: "Satellite Scene Footprints", color: "#7c3aed" },
]

export const defaultVisibleLayers: MapLayerId[] = ["district-boundary", "block-boundary", "village-boundary", "watershed-boundary", "geo-tagged-photos", "interventions", "drainage-network", "water-bodies"]
