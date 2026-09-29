import { useEffect, useMemo, useState } from "react"
import { ArrowDownToLine, Camera, FilePlus2, GitCompareArrows, MapPinned } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { ProvenancePanel } from "../../components/ProvenancePanel"
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, SectionHeader, Select, type SelectOption } from "../../components/ui"
import { MapView, type MapFeatureCollection } from "../../maps"
import type { MapLayerId } from "../../maps/mapLayers"
import { useAuth } from "../../hooks/useAuth"
import { calculateObservedChange } from "../../services/changeAnalysisService"
import { analysisTypeForIndicator, loadAnalyticsWorkspace, type AnalyticsComparison, type AnalyticsIndicator, type AnalyticsWorkspace } from "../../services/analyticsService"

type ChangeIndicator = "NDVI" | "NDWI / Water Index"

interface ComparisonParameters {
  watershedId: string
  indicator: ChangeIndicator
  beforeDate: string
  afterDate: string
}

const emptyFeatures: MapFeatureCollection = { type: "FeatureCollection", features: [] }
const emptyIndicators: AnalyticsIndicator[] = []
const indicatorOptions: SelectOption[] = [
  { value: "NDVI", label: "NDVI / Vegetation" },
  { value: "NDWI / Water Index", label: "Water change / NDWI" },
]

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { dateStyle: "medium" })
}

function formatNumber(value: number | null | undefined, unit = "") {
  return value === null || value === undefined || !Number.isFinite(value) ? "Not recorded" : `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}${unit ? ` ${unit}` : ""}`
}

function resultArea(results: Record<string, unknown>, keyBase: "increased" | "decreased" | "stable") {
  for (const [key, unit] of [[`${keyBase}_area_ha`, "ha"], [`${keyBase}_area_m2`, "sq m"]] as const) {
    const value = results[key]
    if (typeof value === "number" && Number.isFinite(value)) return formatNumber(value, unit)
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return formatNumber(Number(value), unit)
  }
  return "Not recorded"
}

function mostRecentOnOrBefore(records: AnalyticsIndicator[], targetDate: string) {
  return [...records].filter((record) => record.observedAt.slice(0, 10) <= targetDate).sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0]
}

function boundsFor(features: MapFeatureCollection): [[number, number], [number, number]] | undefined {
  const points: number[][] = []
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return
    if (typeof value[0] === "number" && typeof value[1] === "number") points.push(value as number[])
    else value.forEach(visit)
  }
  features.features.forEach((feature) => {
    if (feature.geometry && "coordinates" in feature.geometry) visit(feature.geometry.coordinates)
  })
  if (!points.length) return undefined
  const longitudes = points.map((point) => point[0])
  const latitudes = points.map((point) => point[1])
  return [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]]
}

function MapPanel({ title, description, features, layer }: { title: string; description: string; features: MapFeatureCollection; layer: MapLayerId }) {
  const [visibleLayers, setVisibleLayers] = useState<MapLayerId[]>([layer])
  const bounds = useMemo(() => boundsFor(features), [features])
  return <Card className="min-w-0"><SectionHeader description={description} title={title} />{features.features.length ? <div className="mt-4"><MapView className="h-[min(45vh,32rem)] min-h-72" data={features} fitBounds={bounds} initialView={{ center: [78.96, 20.59], zoom: 5 }} onVisibleLayersChange={setVisibleLayers} visibleLayerIds={visibleLayers} /></div> : <div className="mt-4 grid min-h-72 place-items-center rounded-xl border border-dashed border-line bg-canvas p-4 text-center"><div><MapPinned aria-hidden="true" className="mx-auto size-8 text-muted" /><p className="mt-2 text-sm font-semibold text-ink">Map layer unavailable</p><p className="mt-1 max-w-sm text-xs leading-5 text-muted">No authorized scene footprint or analysis geometry is recorded for this selection. No placeholder geometry is shown.</p></div></div>}</Card>
}

function mapForScene(workspace: AnalyticsWorkspace | null, sceneId: string | null | undefined): MapFeatureCollection {
  if (!workspace || !sceneId) return emptyFeatures
  return { type: "FeatureCollection", features: workspace.sceneFootprints.features.filter((feature) => String(feature.properties?.scene_id ?? feature.id ?? "") === sceneId) }
}

function mapForChange(workspace: AnalyticsWorkspace | null, comparison: AnalyticsComparison | undefined, layer: MapLayerId): MapFeatureCollection {
  if (!workspace || !comparison) return emptyFeatures
  return {
    type: "FeatureCollection",
    features: workspace.changeFeatures.features.flatMap((feature) => {
      const id = String(feature.properties?.change_analysis_id ?? feature.id ?? "")
      return id === comparison.id ? [{ ...feature, properties: { ...feature.properties, layerId: layer } }] : []
    }),
  }
}

function exportGeoJSON(features: MapFeatureCollection, parameters: ComparisonParameters) {
  const blob = new Blob([JSON.stringify({ ...features, metadata: { ...parameters, exportType: "Temporal change detection spatial features" } }, null, 2)], { type: "application/geo+json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `change-detection-${parameters.indicator.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-${parameters.beforeDate}-to-${parameters.afterDate}.geojson`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function addToReportDraft(payload: Record<string, unknown>) {
  const key = "jaldrishti-report-drafts"
  const current = sessionStorage.getItem(key)
  let drafts: unknown[] = []
  if (current) {
    try {
      const parsed: unknown = JSON.parse(current)
      if (Array.isArray(parsed)) drafts = parsed
    } catch {
      drafts = []
    }
  }
  sessionStorage.setItem(key, JSON.stringify([...drafts, payload]))
}

function ChangeDetectionPage() {
  const { configurationError } = useAuth()
  const [searchParams] = useSearchParams()
  const [workspace, setWorkspace] = useState<AnalyticsWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [watershedId, setWatershedId] = useState(() => searchParams.get("watershed") ?? "")
  const [indicator, setIndicator] = useState<ChangeIndicator>("NDVI")
  const [beforeDate, setBeforeDate] = useState(() => searchParams.get("from") ?? "")
  const [afterDate, setAfterDate] = useState(() => searchParams.get("to") ?? "")
  const [parameters, setParameters] = useState<ComparisonParameters | null>(null)
  const [reportMessage, setReportMessage] = useState("")

  useEffect(() => {
    let active = true
    loadAnalyticsWorkspace().then((value) => { if (active) setWorkspace(value) }).catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Change-analysis data could not be loaded.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const indicators = workspace?.indicators ?? emptyIndicators
  const availableWatersheds = workspace?.watersheds ?? []
  const selectedWatershed = availableWatersheds.find((item) => item.id === parameters?.watershedId)
  const candidateIndicators = useMemo(() => indicators.filter((item) => item.watershedId === parameters?.watershedId && analysisTypeForIndicator(item.code) === parameters?.indicator), [indicators, parameters])
  const before = parameters ? mostRecentOnOrBefore(candidateIndicators, parameters.beforeDate) : undefined
  const after = parameters ? mostRecentOnOrBefore(candidateIndicators, parameters.afterDate) : undefined
  const validPair = Boolean(before && after && after.observedAt > before.observedAt)
  const linkedComparison = validPair ? workspace?.comparisons.find((comparison) => comparison.baselineIndicatorId === before?.id && comparison.comparisonIndicatorId === after?.id) : undefined
  const selectedSceneBefore = before?.sourceSceneId ? workspace?.scenes.find((scene) => scene.id === before.sourceSceneId) : undefined
  const selectedSceneAfter = after?.sourceSceneId ? workspace?.scenes.find((scene) => scene.id === after.sourceSceneId) : undefined
  const beforeMap = mapForScene(workspace, selectedSceneBefore?.id)
  const afterMap = mapForScene(workspace, selectedSceneAfter?.id)
  const changeLayer: MapLayerId = parameters?.indicator === "NDWI / Water Index" ? "water-change" : "vegetation-change"
  const changeMap = mapForChange(workspace, linkedComparison, changeLayer)
  const resultMetadata = linkedComparison?.resultMetadata ?? {}
  const calculatedChange = validPair && before && after ? after.value - before.value : null
  const changeValue = linkedComparison?.observedChange ?? calculatedChange
  const changeValueLabel = linkedComparison?.observedChange !== null && linkedComparison?.observedChange !== undefined ? "Stored analysis value" : calculatedChange === null ? "Not recorded" : "Calculated from recorded after - before indicators"
  const stateNameForWatershed = (id: string) => {
    const area = workspace?.areas.find((item) => item.watershedId === id)
    return area ? `${area.stateName} / ${area.districtName}` : "Administrative area not linked"
  }
  const watershedOptions: SelectOption[] = availableWatersheds.map((watershed) => ({ value: watershed.id, label: `${watershed.code} / ${watershed.name} / ${stateNameForWatershed(watershed.id)}` }))
  const beforeSceneSource = selectedSceneBefore?.sourceId ? workspace?.sources.find((source) => source.id === selectedSceneBefore.sourceId) : undefined
  const afterSceneSource = selectedSceneAfter?.sourceId ? workspace?.sources.find((source) => source.id === selectedSceneAfter.sourceId) : undefined
  const method = [before?.methodology.processing_method, after?.methodology.processing_method, before?.methodology.method, after?.methodology.method].find((value) => typeof value === "string")
  const processingDate = [linkedComparison?.analysisMetadata.processing_date, linkedComparison?.resultMetadata.processing_date].find((value) => typeof value === "string")
  const resolution = [...new Set([selectedSceneBefore?.resolutionM, selectedSceneAfter?.resolutionM].filter((value): value is number => value !== null && value !== undefined))]
  const exportDisabled = changeMap.features.length === 0

  function applyComparison() {
    if (!watershedId || !beforeDate || !afterDate || afterDate <= beforeDate) return
    setParameters({ watershedId, indicator, beforeDate, afterDate })
    setReportMessage("")
  }

  function addCurrentToReport() {
    if (!parameters || !validPair || !before || !after) return
    try {
      addToReportDraft({
        type: "TEMPORAL_CHANGE_DETECTION",
        watershedId: parameters.watershedId,
        watershedName: selectedWatershed?.name,
        indicator: parameters.indicator,
        beforeDate: before.observedAt,
        afterDate: after.observedAt,
        beforeValue: before.value,
        afterValue: after.value,
        changeValue,
        changeValueSource: changeValueLabel,
        areaHectares: linkedComparison?.affectedAreaHa ?? null,
        spatialAssociationId: linkedComparison?.id ?? null,
        attribution: "Observed change and spatial association only; no causal claim.",
        provenance: {
          dataSource: beforeSceneSource?.name ?? afterSceneSource?.name ?? null,
          sourceType: "Temporal change analysis",
          dataset: "public.change_analysis / public.indicators / public.satellite_scenes",
          acquisitionDate: after.observedAt,
          processingDate: typeof processingDate === "string" ? processingDate : null,
          processingMethod: typeof method === "string" ? method : null,
          spatialResolution: resolution.length ? resolution.map((value) => `${value} m`).join(" / ") : null,
          analysisPeriod: `${before.observedAt} to ${after.observedAt}`,
          createdBy: linkedComparison?.createdBy ?? null,
          lastUpdated: linkedComparison?.updatedAt ?? linkedComparison?.createdAt ?? null,
          sourceReference: `${linkedComparison?.id ?? "No linked change-analysis ID"} / ${before.id} / ${after.id}`,
        },
      })
      setReportMessage("Comparison added to this browser session's report draft.")
    } catch {
      setReportMessage("The report draft could not be saved in this browser session.")
    }
  }

  const header = <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "Analysis" }, { label: "Change Detection" }]} />} description="Compare recorded watershed indicator observations across two dates and review mapped spatial change." eyebrow="Temporal analysis" title="Change Detection" />
  if (configurationError) return <div className="page-section">{header}<ErrorState description="Supabase is not configured. Add the shared project URL and publishable key to local .env before loading comparison records." title="Supabase setup required" /></div>
  if (loading) return <div className="page-section">{header}<Card><LoadingState label="Loading temporal change data" rows={5} /></Card></div>
  if (loadError) return <div className="page-section">{header}<ErrorState description={loadError} title="Change detection unavailable" /></div>

  const dateOrderInvalid = Boolean(beforeDate && afterDate && afterDate <= beforeDate)
  return <div className="page-section">
    {header}
    <Card className="p-4">
      <form className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.5fr)_minmax(12rem,1fr)_minmax(10rem,0.8fr)_minmax(10rem,0.8fr)_auto]" onSubmit={(event) => { event.preventDefault(); applyComparison() }}>
        <Select label="Watershed" onChange={(event) => setWatershedId(event.target.value)} options={watershedOptions} placeholder="Select watershed" required value={watershedId} />
        <Select label="Indicator" onChange={(event) => setIndicator(event.target.value as ChangeIndicator)} options={indicatorOptions} value={indicator} />
        <Input label="Before date" onChange={(event) => setBeforeDate(event.target.value)} required type="date" value={beforeDate} />
        <Input error={dateOrderInvalid ? "After date must be later than before date." : undefined} label="After date" onChange={(event) => setAfterDate(event.target.value)} required type="date" value={afterDate} />
        <Button disabled={!watershedId || !beforeDate || !afterDate || dateOrderInvalid} leadingIcon={GitCompareArrows} type="submit">Compare dates</Button>
      </form>
      <p className="mt-3 text-xs leading-5 text-muted">The comparison uses the most recent matching indicator observation on or before each selected date. Displayed observation dates remain visible in the results.</p>
    </Card>

    {parameters && (!before || !after || !validPair) && (
      <Card className="p-6">
        <EmptyState
          className="min-h-40"
          description="Insufficient satellite observations available for this watershed and indicator timeframe. At least two chronological observations (baseline and comparison) are required to calculate change analysis."
          icon={GitCompareArrows}
          title="Insufficient observations available"
        />
      </Card>
    )}

    <div className="grid items-start gap-4 xl:grid-cols-2">
      <MapPanel description={before ? `${before.code} observed ${formatDate(before.observedAt)}${selectedSceneBefore ? ` / ${selectedSceneBefore.sceneIdentifier}` : ""}` : "Select a watershed and dates to locate a baseline record."} features={beforeMap} layer="satellite-scenes" title="Before map" />
      <MapPanel description={after ? `${after.code} observed ${formatDate(after.observedAt)}${selectedSceneAfter ? ` / ${selectedSceneAfter.sceneIdentifier}` : ""}` : "Select a watershed and dates to locate a comparison record."} features={afterMap} layer="satellite-scenes" title="After map" />
    </div>
    <Card><SectionHeader description="Stored analysis geometry for the selected before/after observation pair." title="Observed change map" />{changeMap.features.length ? <div className="mt-4"><MapPanel key={changeLayer} description={`${parameters?.indicator} / ${selectedWatershed?.name ?? "Watershed"} / temporal comparison`} features={changeMap} layer={changeLayer} title="Change map" /></div> : <EmptyState className="min-h-48" description={validPair ? "No linked change-analysis geometry is recorded for this exact indicator pair." : "A change map appears when both observations and a linked spatial analysis are available."} icon={MapPinned} title="No mapped change result" />}</Card>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      { title: "Total affected area", value: linkedComparison?.affectedAreaHa === null || linkedComparison?.affectedAreaHa === undefined ? "Not recorded" : formatNumber(linkedComparison.affectedAreaHa, "ha") },
      { title: "Increase", value: resultArea(resultMetadata, "increased") },
      { title: "Decrease", value: resultArea(resultMetadata, "decreased") },
      { title: "Stable area", value: resultArea(resultMetadata, "stable") },
    ].map((metric) => <Card className="p-4" key={metric.title}><p className="text-xs font-medium text-muted">{metric.title}</p><p className="mt-2 text-xl font-bold text-ink">{metric.value}</p></Card>)}</div>

    {validPair && before && after && <ProvenancePanel dataSource={beforeSceneSource?.name ?? afterSceneSource?.name} sourceType="Temporal change analysis" dataset="public.change_analysis / public.indicators / public.satellite_scenes" acquisitionDate={after.observedAt} processingDate={typeof processingDate === "string" ? processingDate : null} processingMethod={typeof method === "string" ? method : null} spatialResolution={resolution.length ? resolution.map((value) => `${value} m`).join(" / ") : null} analysisPeriod={`${formatDate(before.observedAt)} to ${formatDate(after.observedAt)}`} createdBy={linkedComparison?.createdBy} lastUpdated={linkedComparison?.updatedAt ?? linkedComparison?.createdAt} sourceReference={`${linkedComparison?.id ?? "No linked change-analysis ID"} / ${before.id} / ${after.id}`} title="Change detection provenance" />}
    <Card><div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Limitations</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900/90"><li>Map panels show scene coverage footprints, not raster pixel previews.</li><li>Increase, decrease, and stable area are shown only when explicitly recorded in the analysis results.</li><li>Temporal comparison and spatial association do not establish causal attribution to an intervention.</li><li>Cloud, sensor, resolution, and processing differences may affect comparability; see the source metadata.</li></ul></div>
    </Card>

    <Card><SectionHeader description="Comparison summary and navigation actions." title="Actions" /><div className="mt-4 flex flex-wrap gap-2"><Button disabled={exportDisabled || !parameters} leadingIcon={ArrowDownToLine} onClick={() => parameters && exportGeoJSON(changeMap, parameters)} variant="secondary">Export Map (GeoJSON)</Button><Button disabled={!parameters || !validPair} leadingIcon={FilePlus2} onClick={addCurrentToReport}>Add to Report</Button>{parameters && <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-ink hover:bg-canvas" to={`/gis/field-evidence?watershed=${encodeURIComponent(parameters.watershedId)}`}><Camera aria-hidden="true" className="size-4" />View Evidence</Link>}</div>{reportMessage && <p aria-live="polite" className="mt-3 text-xs text-environment-700" role="status">{reportMessage}</p>}{parameters && validPair && before && after && (
      <div className="mt-4 rounded-lg border border-line bg-canvas p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Documented Physical Interpretation</p>
        <p className="mt-1 text-sm font-medium text-ink">{calculateObservedChange({ before_value: before.value, after_value: after.value, indicator: parameters.indicator, processing_method: typeof method === "string" ? method : undefined }).interpretation}</p>
        <p className="mt-2 text-xs leading-5 text-muted">Observed change: {formatNumber(changeValue, before.unit)} ({changeValueLabel}). Increase/decrease/stable areas: {resultArea(resultMetadata, "increased")} / {resultArea(resultMetadata, "decreased")} / {resultArea(resultMetadata, "stable")}. Formula: after_value - before_value. Note: Numerical change is presented without assuming positive values denote watershed improvement.</p>
      </div>
    )}</Card>

    <p className="text-xs leading-5 text-muted">Results describe observed change, temporal comparison, and spatial association. They do not claim that an intervention caused the change.</p>
  </div>
}

export default ChangeDetectionPage
