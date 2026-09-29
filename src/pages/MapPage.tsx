import { useEffect, useMemo, useState } from "react"
import { Info } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { Breadcrumbs } from "../components/Breadcrumbs"
import { Badge, Card, ErrorState, LoadingState, PageHeader } from "../components/ui"
import { MapView, type MapFeatureCollection } from "../maps"
import type { MapLayerId } from "../maps/mapLayers"
import { loadWatershedExplorerWorkspace } from "../services/watershedExplorerService"
import { useAuth } from "../hooks/useAuth"
import { isWithinRouteDateRange, readRouteDateRange } from "../lib/routeScope"

const emptyFeatures: MapFeatureCollection = { type: "FeatureCollection", features: [] }

function MapPage() {
  const { configurationError } = useAuth()
  const [searchParams] = useSearchParams()
  const watershedId = searchParams.get("watershed") ?? ""
  const dateRange = readRouteDateRange(searchParams)
  const [workspace, setWorkspace] = useState<Awaited<ReturnType<typeof loadWatershedExplorerWorkspace>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visibleLayers, setVisibleLayers] = useState<MapLayerId[]>(["district-boundary", "block-boundary", "village-boundary", "watershed-boundary", "sub-watersheds", "geo-tagged-photos", "interventions", "satellite-scenes", "vegetation-change"])

  useEffect(() => {
    let active = true
    loadWatershedExplorerWorkspace()
      .then((value) => { if (active) setWorkspace(value) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "GIS data could not be loaded.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const selected = workspace?.watersheds.find((item) => item.id === watershedId)
  const data = useMemo(() => {
    if (!workspace) return emptyFeatures
    if (!watershedId) return workspace.features
    return { type: "FeatureCollection" as const, features: workspace.features.features.filter((feature) => {
      if (watershedId && String(feature.properties?.watershed_id ?? "") !== watershedId) return false
      const layerId = feature.properties?.layerId
      const featureDate = layerId === "geo-tagged-photos" ? feature.properties?.captured_at : layerId === "interventions" ? feature.properties?.implementation_date : null
      return layerId !== "geo-tagged-photos" && layerId !== "interventions" || isWithinRouteDateRange(typeof featureDate === "string" ? featureDate : null, dateRange)
    }) }
  }, [dateRange, watershedId, workspace])
  const fitBounds = useMemo((): [[number, number], [number, number]] | undefined => {
    const coordinates: number[][] = []
    const visit = (value: unknown) => {
      if (!Array.isArray(value)) return
      if (typeof value[0] === "number" && typeof value[1] === "number") coordinates.push(value as number[])
      else value.forEach(visit)
    }
    data.features.forEach((feature) => { if (feature.geometry && "coordinates" in feature.geometry) visit(feature.geometry.coordinates) })
    if (!coordinates.length) return undefined
    const longitudes = coordinates.map(([longitude]) => longitude)
    const latitudes = coordinates.map(([, latitude]) => latitude)
    return [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]]
  }, [data])

  return <div className="page-section">
    <PageHeader actions={<Badge variant="info">{selected ? selected.name : "Map workspace"}</Badge>} breadcrumbs={<Breadcrumbs items={[{ label: "GIS" }, { label: "Map Layers" }]} />} description="Explore watershed boundaries and linked field evidence and interventions." eyebrow="GIS workspace" title="GIS Map & Layers" />
    {configurationError ? <ErrorState description="Supabase is not configured. Add the shared project URL and publishable key to local .env before loading GIS records." title="Supabase setup required" /> : loading ? <Card><LoadingState label="Loading watershed GIS layers" rows={5} /></Card> : error ? <ErrorState description={error} onRetry={() => window.location.reload()} /> : <>
      {watershedId && !selected && <ErrorState description="The selected watershed is not available in your permitted data scope." title="Watershed not found" />}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-900"><Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p>{data.features.length ? `${data.features.length} mapped features${selected ? ` for ${selected.code} · ${selected.name}` : ""}.` : "No GIS features are registered for this selection."} Streets use OpenStreetMap tiles; satellite imagery requires a configured style.</p></div>
      <MapView className="h-[min(74vh,56rem)] min-h-[34rem]" data={data} fitBounds={fitBounds} onVisibleLayersChange={setVisibleLayers} visibleLayerIds={visibleLayers} />
    </>}
  </div>
}

export default MapPage
