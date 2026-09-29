import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Activity, Layers3, MapPinned, RefreshCw, Satellite, Sprout, Waves } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { ProvenancePanel } from "../../components/ProvenancePanel"
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, SectionHeader, Select, type SelectOption } from "../../components/ui"
import { MapView, type MapFeatureCollection } from "../../maps"
import type { MapLayerId } from "../../maps/mapLayers"
import { useAuth } from "../../hooks/useAuth"
import { analysisTypeForIndicator, loadAnalyticsWorkspace, type AnalyticsComparison, type AnalyticsIndicator, type AnalyticsType, type AnalyticsWorkspace } from "../../services/analyticsService"
import { remoteSensingProducts } from "../../services/remoteSensingService"

const emptyIndicators: AnalyticsIndicator[] = []
const analysisIcons = { "NDVI": Sprout, "NDWI / Water Index": Waves, "Land Use / Land Cover": Layers3, "Change Detection": Activity }
const analysisDescriptions: Record<AnalyticsType, string> = {
  "NDVI": "Vegetation index observations linked to source satellite scenes.",
  "NDWI / Water Index": "Recorded water index observations linked to source satellite scenes.",
  "Land Use / Land Cover": "Recorded land use and land cover class observations.",
  "Change Detection": "Stored baseline and comparison analysis results with mapped affected areas.",
}

function mapLayerForAnalysis(type: AnalyticsType): MapLayerId {
  if (type === "NDWI / Water Index") return "water-change"
  if (type === "Land Use / Land Cover") return "land-use-land-cover"
  return "vegetation-change"
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { dateStyle: "medium" })
}

function formatMetric(value: number | null | undefined, unit = "") {
  return value === null || value === undefined || !Number.isFinite(value) ? "Not recorded" : `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}${unit ? ` ${unit}` : ""}`
}

function getResultArea(results: Record<string, unknown>, type: "increased" | "decreased") {
  for (const [key, unit] of [[`${type}_area_ha`, "ha"], [`${type}_area_m2`, "m²"]] as const) {
    const value = results[key]
    if (typeof value === "number" && Number.isFinite(value)) return formatMetric(value, unit)
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return formatMetric(Number(value), unit)
  }
  return "Not recorded"
}

function isInDateRange(value: string, from: string, to: string) {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return false
  if (from && time < new Date(`${from}T00:00:00`).getTime()) return false
  if (to && time > new Date(`${to}T23:59:59.999`).getTime()) return false
  return true
}

function selectComparisonType(comparison: AnalyticsComparison, byId: Map<string, AnalyticsIndicator>, type: AnalyticsType) {
  if (type === "Change Detection") return true
  const before = byId.get(comparison.baselineIndicatorId)
  const after = byId.get(comparison.comparisonIndicatorId)
  return Boolean(before && after && analysisTypeForIndicator(before.code) === type && analysisTypeForIndicator(after.code) === type)
}

function makeDistribution(values: number[]) {
  if (!values.length) return []
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const width = maximum === minimum ? 1 : (maximum - minimum) / 6
  const bins = Array.from({ length: 6 }, (_, index) => ({
    range: `${(minimum + index * width).toFixed(2)}–${(minimum + (index + 1) * width).toFixed(2)}`,
    count: 0,
  }))
  for (const value of values) {
    const index = maximum === minimum ? 2 : Math.min(5, Math.floor((value - minimum) / width))
    bins[index].count += 1
  }
  return bins
}

function ChartPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card><SectionHeader description={description} title={title} /><div className="mt-4 h-64">{children}</div></Card>
}

function ImagePanel({ title, indicator, sceneLabel, reference }: { title: string; indicator?: AnalyticsIndicator; sceneLabel?: string; reference?: string | null }) {
  return <Card className="min-w-0"><SectionHeader description={indicator ? `${indicator.code} · ${dateLabel(indicator.observedAt)}` : "No paired indicator recorded"} title={title} />
    <div className="mt-4 grid min-h-56 place-items-center rounded-lg border border-dashed border-line bg-slate-50 p-4 text-center">
      <div><Satellite aria-hidden="true" className="mx-auto size-8 text-slate-400" /><p className="mt-2 text-sm font-medium text-ink">Raster preview unavailable</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted">The record has no configured preview renderer. No substitute imagery is shown.</p></div>
    </div>
    <div className="mt-3 space-y-1 text-xs text-muted"><p>Value: <span className="font-medium text-ink">{indicator ? formatMetric(indicator.value, indicator.unit) : "Not recorded"}</span></p>{sceneLabel && <p>Source scene: <span className="font-medium text-ink">{sceneLabel}</span></p>}{reference && <p className="break-all">Raster reference: {reference}</p>}</div>
  </Card>
}

function AnalyticsCenter() {
  const { configurationError } = useAuth()
  const [searchParams] = useSearchParams()
  const [workspace, setWorkspace] = useState<AnalyticsWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState<AnalyticsType>("NDVI")
  const [stateId, setStateId] = useState("")
  const [districtId, setDistrictId] = useState("")
  const [watershedId, setWatershedId] = useState(() => searchParams.get("watershed") ?? "")
  const [fromDate, setFromDate] = useState(() => searchParams.get("from") ?? "")
  const [toDate, setToDate] = useState(() => searchParams.get("to") ?? "")
  const [comparisonId, setComparisonId] = useState("")
  const [visibleMapLayers, setVisibleMapLayers] = useState<MapLayerId[]>(["vegetation-change", "water-change"])

  useEffect(() => {
    let active = true
    loadAnalyticsWorkspace().then((value) => { if (active) setWorkspace(value) }).catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Analytics data could not be loaded.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const states = useMemo(() => [...new Map((workspace?.areas ?? []).map((area) => [area.stateId, { id: area.stateId, name: area.stateName }])).values()].sort((a, b) => a.name.localeCompare(b.name)), [workspace?.areas])
  const districts = useMemo(() => [...new Map((workspace?.areas ?? []).filter((area) => !stateId || area.stateId === stateId).map((area) => [area.districtId, { id: area.districtId, name: area.districtName }])).values()].sort((a, b) => a.name.localeCompare(b.name)), [stateId, workspace?.areas])
  const watersheds = useMemo(() => {
    const allowed = new Set((workspace?.areas ?? []).filter((area) => (!stateId || area.stateId === stateId) && (!districtId || area.districtId === districtId)).map((area) => area.watershedId))
    return (workspace?.watersheds ?? []).filter((watershed) => (!stateId && !districtId) || allowed.has(watershed.id))
  }, [districtId, stateId, workspace?.areas, workspace?.watersheds])
  const indicators = workspace?.indicators ?? emptyIndicators
  const indicatorsById = useMemo(() => new Map(indicators.map((indicator) => [indicator.id, indicator])), [indicators])
  const scopedWatershedIds = useMemo(() => new Set((workspace?.areas ?? []).filter((area) => (!stateId || area.stateId === stateId) && (!districtId || area.districtId === districtId)).map((area) => area.watershedId)), [districtId, stateId, workspace?.areas])
  const filteredIndicators = useMemo(() => indicators.filter((indicator) =>
    ((!stateId && !districtId) || scopedWatershedIds.has(indicator.watershedId)) &&
    (!watershedId || indicator.watershedId === watershedId) &&
    (!analysisType || analysisTypeForIndicator(indicator.code) === analysisType) &&
    isInDateRange(indicator.observedAt, fromDate, toDate),
  ), [analysisType, districtId, fromDate, indicators, scopedWatershedIds, stateId, toDate, watershedId])
  const comparisons = useMemo(() => (workspace?.comparisons ?? []).filter((comparison) =>
    ((!stateId && !districtId) || scopedWatershedIds.has(comparison.watershedId)) &&
    (!watershedId || comparison.watershedId === watershedId) &&
    selectComparisonType(comparison, indicatorsById, analysisType) &&
    isInDateRange(indicatorsById.get(comparison.comparisonIndicatorId)?.observedAt ?? comparison.createdAt, fromDate, toDate),
  ), [analysisType, districtId, fromDate, indicatorsById, scopedWatershedIds, stateId, toDate, watershedId, workspace?.comparisons])

  const selectedComparison = comparisons.find((item) => item.id === comparisonId) ?? comparisons[0]
  const before = selectedComparison ? indicatorsById.get(selectedComparison.baselineIndicatorId) : undefined
  const after = selectedComparison ? indicatorsById.get(selectedComparison.comparisonIndicatorId) : undefined
  const sourceById = useMemo(() => new Map((workspace?.sources ?? []).map((source) => [source.id, source])), [workspace?.sources])
  const sceneById = useMemo(() => new Map((workspace?.scenes ?? []).map((scene) => [scene.id, scene])), [workspace?.scenes])
  const baselineScene = before?.sourceSceneId ? sceneById.get(before.sourceSceneId) : undefined
  const comparisonScene = after?.sourceSceneId ? sceneById.get(after.sourceSceneId) : undefined
  const baselineSource = before?.dataSourceId ? sourceById.get(before.dataSourceId) : undefined
  const comparisonSource = after?.dataSourceId ? sourceById.get(after.dataSourceId) : undefined
  const visibleChangeIds = useMemo(() => new Set(comparisons.map((item) => item.id)), [comparisons])
  const visibleFeatures: MapFeatureCollection = useMemo(() => ({
    type: "FeatureCollection",
    features: workspace?.changeFeatures.features.flatMap((feature) => {
      const id = String(feature.properties?.change_analysis_id ?? feature.id ?? "")
      if (!visibleChangeIds.has(id)) return []
      const layerId = mapLayerForAnalysis(analysisType)
      return [{ ...feature, properties: { ...feature.properties, layerId } }]
    }) ?? [],
  }), [analysisType, visibleChangeIds, workspace?.changeFeatures.features])
  const mapBounds = useMemo(() => {
    const points = visibleFeatures.features.flatMap((feature) => {
      if (!feature.geometry) return []
      const coords: number[][] = []
      const visit = (value: unknown) => {
        if (!Array.isArray(value)) return
        if (typeof value[0] === "number" && typeof value[1] === "number") coords.push(value as number[])
        else value.forEach(visit)
      }
      if ("coordinates" in feature.geometry) visit(feature.geometry.coordinates)
      return coords
    })
    if (!points.length) return undefined
    const lng = points.map((point) => point[0]); const lat = points.map((point) => point[1])
    return [[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]] as [[number, number], [number, number]]
  }, [visibleFeatures])
  const trendData = [...filteredIndicators].sort((a, b) => a.observedAt.localeCompare(b.observedAt)).map((item) => ({ date: dateLabel(item.observedAt), value: item.value }))
  const ndviDistribution = analysisType === "NDVI" ? makeDistribution(filteredIndicators.map((item) => item.value)) : []
  const sourceLabel = baselineSource?.name || comparisonSource?.name || baselineScene?.sourceId && sourceById.get(baselineScene.sourceId)?.name || comparisonScene?.sourceId && sourceById.get(comparisonScene.sourceId)?.name || "Not recorded"
  const processingMethod = [before?.methodology.processing_method, after?.methodology.processing_method, before?.methodology.method, after?.methodology.method].find((value) => typeof value === "string")
  const resolutions = [...new Set([baselineScene?.resolutionM, comparisonScene?.resolutionM].filter((value): value is number => value !== null && value !== undefined))]
  const analysisPeriod = before && after ? `${dateLabel(before.observedAt)} – ${dateLabel(after.observedAt)}` : "Not recorded"
  const stateOptions: SelectOption[] = states.map((state) => ({ value: state.id, label: state.name }))
  const districtOptions: SelectOption[] = districts.map((district) => ({ value: district.id, label: district.name }))
  const watershedOptions: SelectOption[] = watersheds.map((watershed) => ({ value: watershed.id, label: `${watershed.code} · ${watershed.name}` }))
  const comparisonOptions: SelectOption[] = comparisons.map((item) => {
    const watershed = workspace?.watersheds.find((candidate) => candidate.id === item.watershedId)
    const comparisonIndicator = indicatorsById.get(item.comparisonIndicatorId)
    return { value: item.id, label: `${watershed?.code ?? "Watershed"} · ${dateLabel(comparisonIndicator?.observedAt ?? item.createdAt)} · ${item.status}` }
  })

  const resetFilters = () => { setStateId(""); setDistrictId(""); setWatershedId(""); setFromDate(""); setToDate(""); setComparisonId("") }
  const header = <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "Analysis" }, { label: "Analytics" }]} />} description="Explore recorded remote-sensing indicators and change-analysis results across watershed areas." eyebrow="Analytics Center" title="Analytics Center" />
  if (configurationError) return <div className="page-section">{header}<ErrorState description="Supabase is not configured. Add the shared project URL and publishable key to local .env before loading analytics." title="Supabase setup required" /></div>
  if (loading) return <div className="page-section">{header}<Card><LoadingState label="Loading analysis records" rows={5} /></Card></div>
  if (loadError) return <div className="page-section">{header}<ErrorState description={loadError} title="Analytics unavailable" /></div>

  const beforeImageScene = baselineScene?.sceneIdentifier ?? undefined
  const afterImageScene = comparisonScene?.sceneIdentifier ?? undefined
  const watershedName = workspace?.watersheds.find((item) => item.id === watershedId)?.name

  return <div className="page-section">
    {header}
    <Card className="p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Select label="State" onChange={(event) => { setStateId(event.target.value); setDistrictId(""); setWatershedId("") }} options={stateOptions} placeholder="All states" value={stateId} /><Select label="District" onChange={(event) => { setDistrictId(event.target.value); setWatershedId("") }} options={districtOptions} placeholder="All districts" value={districtId} /><Select label="Watershed" onChange={(event) => setWatershedId(event.target.value)} options={watershedOptions} placeholder="All watersheds" value={watershedId} /><div className="grid grid-cols-2 gap-2"><Input label="From date" onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} /><Input label="To date" onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} /></div></div>
      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="mb-2 text-sm font-medium text-ink">Analysis type</p><div aria-label="Analysis type" className="flex flex-wrap gap-2" role="tablist">{remoteSensingProducts.map((type) => { const Icon = analysisIcons[type]; return <button aria-selected={analysisType === type} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-700 ${analysisType === type ? "border-brand-700 bg-blue-50 text-brand-900" : "border-line bg-white text-muted hover:bg-canvas"}`} key={type} onClick={() => { setAnalysisType(type); setVisibleMapLayers([mapLayerForAnalysis(type)]) }} role="tab" type="button"><Icon aria-hidden="true" className="size-4" />{type}</button> })}</div></div>
        {comparisons.length > 0 && <Select className="lg:min-w-72" label="Comparison record" onChange={(event) => setComparisonId(event.target.value)} options={comparisonOptions} value={selectedComparison?.id ?? ""} />}
        <Button className="self-start lg:self-end" leadingIcon={RefreshCw} onClick={resetFilters} variant="secondary">Reset filters</Button>
      </div>
      <p className="mt-3 text-xs text-muted">{analysisDescriptions[analysisType]} Results use authorized records in the selected scope.</p>
    </Card>

    <Card><SectionHeader description={`${visibleFeatures.features.length} mapped affected areas in the filtered scope${watershedName ? ` · ${watershedName}` : ""}`} title="Analysis map" />{visibleFeatures.features.length ? <div className="mt-4"><MapView className="h-[min(62vh,48rem)] min-h-[28rem]" data={visibleFeatures} fitBounds={mapBounds} initialView={{ center: [78.96, 20.59], zoom: 4 }} onVisibleLayersChange={setVisibleMapLayers} visibleLayerIds={visibleMapLayers} /></div> : <EmptyState className="min-h-64" description="The map displays recorded affected-area polygons. No placeholder geometry is generated." icon={MapPinned} title="No mapped analysis areas" />}</Card>

    {analysisType === "NDVI" && <>
      <div className="grid gap-4 xl:grid-cols-2"><ImagePanel indicator={before} reference={before?.sourceSceneId ? sceneById.get(before.sourceSceneId)?.rasterReference : null} sceneLabel={beforeImageScene} title="Before image" /><ImagePanel indicator={after} reference={after?.sourceSceneId ? sceneById.get(after.sourceSceneId)?.rasterReference : null} sceneLabel={afterImageScene} title="After image" /></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{[
        { label: "Before NDVI", value: before?.value === undefined ? "Not recorded" : formatMetric(before.value, before.unit) },
        { label: "After NDVI", value: after?.value === undefined ? "Not recorded" : formatMetric(after.value, after.unit) },
        { label: "Change", value: formatMetric(selectedComparison?.observedChange, before?.unit ?? after?.unit ?? "") },
        { label: "Affected area", value: selectedComparison?.affectedAreaHa === null || selectedComparison?.affectedAreaHa === undefined ? "Not recorded" : formatMetric(selectedComparison.affectedAreaHa, "ha") },
        { label: "Increased area", value: selectedComparison ? getResultArea(selectedComparison.resultMetadata, "increased") : "Not recorded" },
        { label: "Decreased area", value: selectedComparison ? getResultArea(selectedComparison.resultMetadata, "decreased") : "Not recorded" },
      ].map((metric) => <Card className="min-w-0 p-4" key={metric.label}><p className="text-xs font-medium text-muted">{metric.label}</p><p className="mt-2 break-words text-xl font-bold text-ink">{metric.value}</p></Card>)}</div>
    </>}

    {analysisType === "NDVI" && <div className="grid gap-4 xl:grid-cols-2">
      <ChartPanel description="Counts are binned from the filtered, recorded NDVI values." title="NDVI distribution">{ndviDistribution.length ? <ResponsiveContainer height="100%" width="100%"><BarChart data={ndviDistribution} margin={{ top: 8, right: 12, bottom: 20, left: 0 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="range" fontSize={10} angle={-25} textAnchor="end" /><YAxis allowDecimals={false} fontSize={11} /><ChartTooltip /><Bar dataKey="count" fill="#378b5c" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState description="No NDVI observations match the selected filters." icon={Sprout} title="No distribution available" />}</ChartPanel>
      <ChartPanel description="Recorded NDVI indicator values by observation date." title="NDVI temporal trend">{trendData.length ? <ResponsiveContainer height="100%" width="100%"><LineChart data={trendData} margin={{ top: 8, right: 12, bottom: 10, left: 0 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={10} /><YAxis domain={["auto", "auto"]} fontSize={11} /><ChartTooltip /><Line dataKey="value" dot={false} name="NDVI" stroke="#1670a8" strokeWidth={2} type="monotone" /></LineChart></ResponsiveContainer> : <EmptyState description="No NDVI observations match the selected filters." icon={Activity} title="No temporal trend available" />}</ChartPanel>
    </div>}

    {analysisType !== "NDVI" && <div className="grid gap-4 xl:grid-cols-2"><ChartPanel description={`Recorded ${analysisType} values by observation date.`} title={`${analysisType} temporal trend`}>{trendData.length ? <ResponsiveContainer height="100%" width="100%"><LineChart data={trendData} margin={{ top: 8, right: 12, bottom: 10, left: 0 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={10} /><YAxis domain={["auto", "auto"]} fontSize={11} /><ChartTooltip /><Line dataKey="value" dot={false} name={analysisType} stroke="#1670a8" strokeWidth={2} type="monotone" /></LineChart></ResponsiveContainer> : <EmptyState description="No observations match the selected filters." icon={Activity} title="No temporal trend available" />}</ChartPanel><Card><SectionHeader description="Selected analysis pair, when available." title="Before / after records" /><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-line bg-canvas p-3"><p className="text-xs font-semibold uppercase text-muted">Before</p><p className="mt-2 text-sm font-semibold text-ink">{before?.name ?? "Not recorded"}</p><p className="mt-1 text-xs text-muted">{before ? `${formatMetric(before.value, before.unit)} · ${dateLabel(before.observedAt)}` : "No baseline indicator is linked."}</p></div><div className="rounded-lg border border-line bg-canvas p-3"><p className="text-xs font-semibold uppercase text-muted">After</p><p className="mt-2 text-sm font-semibold text-ink">{after?.name ?? "Not recorded"}</p><p className="mt-1 text-xs text-muted">{after ? `${formatMetric(after.value, after.unit)} · ${dateLabel(after.observedAt)}` : "No comparison indicator is linked."}</p></div></div></Card></div>}

    {selectedComparison && <ProvenancePanel dataSource={sourceLabel === "Not recorded" ? null : sourceLabel} sourceType="Derived indicator analysis" dataset="public.indicators / public.change_analysis" acquisitionDate={after?.observedAt} processingDate={typeof selectedComparison.analysisMetadata.processing_date === "string" ? selectedComparison.analysisMetadata.processing_date : null} processingMethod={typeof processingMethod === "string" ? processingMethod : null} spatialResolution={resolutions.length ? resolutions.map((value) => `${value} m`).join(" / ") : null} analysisPeriod={analysisPeriod} lastUpdated={selectedComparison.createdAt} sourceReference={`${selectedComparison.id} / ${before?.id ?? ""} / ${after?.id ?? ""}`} title="NDVI and analysis provenance" />}
    <p className="text-xs leading-5 text-muted">Charts summarize recorded measurements for the active filters. They do not attribute observed changes to interventions or other causes.</p>
  </div>
}

export default AnalyticsCenter
