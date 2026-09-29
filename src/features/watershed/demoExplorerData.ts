import type { MapFeatureCollection, MapMarker } from "../../maps"

export interface DemoExplorerWatershed {
  id: string
  code: string
  name: string
  district: string
  state: string
  areaSqKm: number
  villages: number
  fieldObservations: number
  interventions: number
  ndvi: string
  waterIndex: string
  changePercentage: string
  lastUpdated: string
  boundary: MapFeatureCollection
  bounds: [[west: number, south: number], [east: number, north: number]]
}

// DEMO DATA — REPLACE LATER. Synthetic geometry and metrics do not represent real administrative areas.
export const demoExplorerWatersheds: DemoExplorerWatershed[] = [
  {
    id: "demo-watershed-001",
    code: "DEMO-WH-001",
    name: "Demo Watershed Alpha",
    district: "Demo District North",
    state: "Demo State One",
    areaSqKm: 18.6,
    villages: 7,
    fieldObservations: 3,
    interventions: 2,
    ndvi: "0.62",
    waterIndex: "0.38",
    changePercentage: "+4.8%",
    lastUpdated: "26 Sep 2026, 2:10 PM IST · DEMO",
    bounds: [[78.05, 20.15], [78.18, 20.27]],
    boundary: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[78.05, 20.16], [78.11, 20.15], [78.18, 20.19], [78.16, 20.25], [78.1, 20.27], [78.06, 20.23], [78.05, 20.16]]] },
        properties: { layerId: "watershed-boundary", title: "Demo Watershed Alpha", code: "DEMO-WH-001", area_sq_km: 18.6 },
      }],
    },
  },
  {
    id: "demo-watershed-002",
    code: "DEMO-WH-002",
    name: "Demo Watershed Beta",
    district: "Demo District South",
    state: "Demo State One",
    areaSqKm: 24.2,
    villages: 9,
    fieldObservations: 2,
    interventions: 3,
    ndvi: "0.57",
    waterIndex: "0.42",
    changePercentage: "+2.1%",
    lastUpdated: "24 Sep 2026, 11:35 AM IST · DEMO",
    bounds: [[78.32, 20.15], [78.46, 20.28]],
    boundary: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[78.32, 20.17], [78.37, 20.15], [78.46, 20.18], [78.44, 20.25], [78.39, 20.28], [78.33, 20.24], [78.32, 20.17]]] },
        properties: { layerId: "watershed-boundary", title: "Demo Watershed Beta", code: "DEMO-WH-002", area_sq_km: 24.2 },
      }],
    },
  },
  {
    id: "demo-watershed-003",
    code: "DEMO-WH-003",
    name: "Demo Watershed Gamma",
    district: "Demo District East",
    state: "Demo State Two",
    areaSqKm: 13.9,
    villages: 5,
    fieldObservations: 4,
    interventions: 1,
    ndvi: "0.49",
    waterIndex: "0.29",
    changePercentage: "−1.6%",
    lastUpdated: "22 Sep 2026, 4:05 PM IST · DEMO",
    bounds: [[78.59, 20.16], [78.73, 20.29]],
    boundary: {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [[[78.59, 20.18], [78.65, 20.16], [78.73, 20.19], [78.7, 20.26], [78.65, 20.29], [78.6, 20.24], [78.59, 20.18]]] },
        properties: { layerId: "watershed-boundary", title: "Demo Watershed Gamma", code: "DEMO-WH-003", area_sq_km: 13.9 },
      }],
    },
  },
]

interface DemoMarkerRecord extends MapMarker {
  watershedId: string
  observedAt: string
}

// Synthetic marker positions and dates are for layout interaction only.
export const demoEvidenceMarkers: DemoMarkerRecord[] = [
  { id: "demo-photo-001", watershedId: "demo-watershed-001", coordinates: [78.09, 20.19], title: "Demo geo-tagged photo", layerId: "geo-tagged-photos", observedAt: "2026-09-26", properties: { verification: "DEMO", captured_at: "2026-09-26" } },
  { id: "demo-photo-002", watershedId: "demo-watershed-001", coordinates: [78.14, 20.22], title: "Demo geo-tagged photo", layerId: "geo-tagged-photos", observedAt: "2026-09-21", properties: { verification: "DEMO", captured_at: "2026-09-21" } },
  { id: "demo-photo-003", watershedId: "demo-watershed-001", coordinates: [78.11, 20.25], title: "Demo geo-tagged photo", layerId: "geo-tagged-photos", observedAt: "2026-09-15", properties: { verification: "DEMO", captured_at: "2026-09-15" } },
  { id: "demo-photo-004", watershedId: "demo-watershed-002", coordinates: [78.36, 20.2], title: "Demo geo-tagged photo", layerId: "geo-tagged-photos", observedAt: "2026-09-24", properties: { verification: "DEMO", captured_at: "2026-09-24" } },
  { id: "demo-photo-005", watershedId: "demo-watershed-002", coordinates: [78.42, 20.24], title: "Demo geo-tagged photo", layerId: "geo-tagged-photos", observedAt: "2026-09-12", properties: { verification: "DEMO", captured_at: "2026-09-12" } },
  { id: "demo-photo-006", watershedId: "demo-watershed-003", coordinates: [78.64, 20.21], title: "Demo geo-tagged photo", layerId: "geo-tagged-photos", observedAt: "2026-09-22", properties: { verification: "DEMO", captured_at: "2026-09-22" } },
  { id: "demo-photo-007", watershedId: "demo-watershed-003", coordinates: [78.69, 20.25], title: "Demo geo-tagged photo", layerId: "geo-tagged-photos", observedAt: "2026-09-10", properties: { verification: "DEMO", captured_at: "2026-09-10" } },
  { id: "demo-photo-008", watershedId: "demo-watershed-003", coordinates: [78.62, 20.26], title: "Demo geo-tagged photo", layerId: "geo-tagged-photos", observedAt: "2026-09-03", properties: { verification: "DEMO", captured_at: "2026-09-03" } },
  { id: "demo-photo-009", watershedId: "demo-watershed-003", coordinates: [78.67, 20.19], title: "Demo geo-tagged photo", layerId: "geo-tagged-photos", observedAt: "2026-08-28", properties: { verification: "DEMO", captured_at: "2026-08-28" } },
]

export const demoInterventionMarkers: DemoMarkerRecord[] = [
  { id: "demo-intervention-001", watershedId: "demo-watershed-001", coordinates: [78.13, 20.18], title: "Demo intervention", layerId: "interventions", observedAt: "2026-09-18", properties: { type: "Contour trench · DEMO", status: "In progress" } },
  { id: "demo-intervention-002", watershedId: "demo-watershed-001", coordinates: [78.08, 20.23], title: "Demo intervention", layerId: "interventions", observedAt: "2026-09-08", properties: { type: "Check structure · DEMO", status: "Completed" } },
  { id: "demo-intervention-003", watershedId: "demo-watershed-002", coordinates: [78.4, 20.18], title: "Demo intervention", layerId: "interventions", observedAt: "2026-09-16", properties: { type: "Plantation · DEMO", status: "In progress" } },
  { id: "demo-intervention-004", watershedId: "demo-watershed-002", coordinates: [78.35, 20.25], title: "Demo intervention", layerId: "interventions", observedAt: "2026-09-05", properties: { type: "Recharge pit · DEMO", status: "Planned" } },
  { id: "demo-intervention-005", watershedId: "demo-watershed-002", coordinates: [78.44, 20.22], title: "Demo intervention", layerId: "interventions", observedAt: "2026-08-27", properties: { type: "Farm bund · DEMO", status: "Completed" } },
  { id: "demo-intervention-006", watershedId: "demo-watershed-003", coordinates: [78.68, 20.22], title: "Demo intervention", layerId: "interventions", observedAt: "2026-09-06", properties: { type: "Percolation tank · DEMO", status: "In progress" } },
]
