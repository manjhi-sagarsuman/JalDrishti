export interface DemoWatershed {
  id: string
  name: string
  state: string
  district: string
  areaHectares: number
  observations: number
  interventions: number
  vegetation: string
  water: string
  status: "On track" | "Needs review" | "Monitoring"
}

// DEMO DATA — REPLACE LATER. Generic labels avoid implying real government records.
export const demoWatersheds: DemoWatershed[] = [
  { id: "demo-01", name: "Demo Watershed 01", state: "Demo State A", district: "Demo District North", areaHectares: 1240, observations: 86, interventions: 14, vegetation: "+8.4%", water: "Moderate", status: "On track" },
  { id: "demo-02", name: "Demo Watershed 02", state: "Demo State A", district: "Demo District South", areaHectares: 980, observations: 54, interventions: 9, vegetation: "+3.1%", water: "Stable", status: "Monitoring" },
  { id: "demo-03", name: "Demo Watershed 03", state: "Demo State B", district: "Demo District East", areaHectares: 1560, observations: 112, interventions: 21, vegetation: "−1.2%", water: "Review", status: "Needs review" },
]

export const demoEvidence = [
  { id: "evidence-01", title: "Check dam inspection", watershedId: "demo-01", location: "Demo District North", time: "Today, 10:42 AM", status: "Verified" },
  { id: "evidence-02", title: "Vegetation plot observation", watershedId: "demo-03", location: "Demo District East", time: "Yesterday, 3:18 PM", status: "Pending review" },
  { id: "evidence-03", title: "Water harvesting structure", watershedId: "demo-02", location: "Demo District South", time: "22 Sep, 11:06 AM", status: "Verified" },
]

export const demoActivities = [
  { id: "activity-01", title: "Field evidence submitted", detail: "Demo Watershed 01 · Check dam inspection", time: "Today, 10:42 AM", color: "bg-blue-600" },
  { id: "activity-02", title: "Intervention marked complete", detail: "Demo Watershed 03 · Contour trenching", time: "Yesterday, 4:10 PM", color: "bg-green-700" },
  { id: "activity-03", title: "Watershed review requested", detail: "Demo Watershed 02 · Water indicator", time: "Yesterday, 1:32 PM", color: "bg-amber-600" },
]
