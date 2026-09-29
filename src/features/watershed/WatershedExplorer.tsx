import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Activity, BarChart3, Camera, Check, FileText, MapPinned, RefreshCw, Satellite, Sprout, Workflow } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { Badge, Button, Card, DateRangePicker, EmptyState, ErrorState, LoadingState, PageHeader, SectionHeader, Select } from "../../components/ui"
import { MapView, type MapFeatureCollection } from "../../maps"
import { analysisTypeForIndicator } from "../../services/analyticsService"
import { loadWatershedExplorerWorkspace, type WatershedExplorerWorkspace } from "../../services/watershedExplorerService"
import { useAuth } from "../../hooks/useAuth"
import { buildScopedPath, isWithinRouteDateRange, readRouteDateRange } from "../../lib/routeScope"

interface ExplorerFilters { state: string; district: string; watershed: string; dates: { start: string; end: string } }
const blankFilters: ExplorerFilters = { state: "", district: "", watershed: "", dates: { start: "", end: "" } }
const emptyFeatures: MapFeatureCollection = { type: "FeatureCollection", features: [] }
const emptyWatersheds: WatershedExplorerWorkspace["watersheds"] = []

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { dateStyle: "medium" })
}

const inDateRange = isWithinRouteDateRange

function boundsFor(features: MapFeatureCollection): [[number, number], [number, number]] | undefined {
  const coordinates: number[][] = []
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return
    if (typeof value[0] === "number" && typeof value[1] === "number") coordinates.push(value as number[])
    else value.forEach(visit)
  }
  features.features.forEach((feature) => { if (feature.geometry && "coordinates" in feature.geometry) visit(feature.geometry.coordinates) })
  if (!coordinates.length) return undefined
  const longitude = coordinates.map(([value]) => value)
  const latitude = coordinates.map(([, value]) => value)
  return [[Math.min(...longitude), Math.min(...latitude)], [Math.max(...longitude), Math.max(...latitude)]]
}

function latestIndicator(workspace: WatershedExplorerWorkspace, watershedId: string, kind: "NDVI" | "NDWI / Water Index", dates: ExplorerFilters["dates"]) {
  return workspace.analytics.indicators
    .filter((item) => item.watershedId === watershedId && item.status !== "REJECTED" && item.status !== "ARCHIVED" && analysisTypeForIndicator(item.code) === kind && inDateRange(item.observedAt, dates))
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0]
}

function WatershedExplorer() {
  const { configurationError } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedWatershed = searchParams.get("watershed") ?? ""
  const initialFilters = { ...blankFilters, watershed: requestedWatershed, dates: readRouteDateRange(searchParams) }
  const [draft, setDraft] = useState<ExplorerFilters>(initialFilters)
  const [applied, setApplied] = useState<ExplorerFilters>(initialFilters)
  const [dateError, setDateError] = useState<string | undefined>()
  const [workspace, setWorkspace] = useState<WatershedExplorerWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadWatershedExplorerWorkspace().then((value) => { if (active) setWorkspace(value) }).catch((cause: unknown) => { if (active) setLoadError(cause instanceof Error ? cause.message : "Watershed data could not be loaded.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const watersheds = workspace?.watersheds ?? emptyWatersheds
  const stateOptions = useMemo(() => [...new Map(watersheds.filter((item) => item.stateId && item.state).map((item) => [item.stateId, { value: item.stateId!, label: item.state! }])).values()], [watersheds])
  const districtOptions = useMemo(() => [...new Map(watersheds.filter((item) => item.districtId && item.district && (!draft.state || item.stateId === draft.state)).map((item) => [item.districtId, { value: item.districtId!, label: item.district! }])).values()], [draft.state, watersheds])
  const draftWatersheds = watersheds.filter((item) => (!draft.state || item.stateId === draft.state) && (!draft.district || item.districtId === draft.district))
  const filteredWatersheds = watersheds.filter((item) => (!applied.state || item.stateId === applied.state) && (!applied.district || item.districtId === applied.district) && (!applied.watershed || item.id === applied.watershed))
  const selected = filteredWatersheds[0]
  const selectedFeatures = useMemo(() => {
    if (!selected || !workspace) return emptyFeatures
    return { type: "FeatureCollection" as const, features: workspace.features.features.filter((feature) => {
      if (String(feature.properties?.watershed_id ?? "") !== selected.id) return false
      const layer = feature.properties?.layerId
      const date = layer === "geo-tagged-photos" ? feature.properties?.captured_at : layer === "interventions" ? feature.properties?.implementation_date : null
      return !date || inDateRange(String(date), applied.dates)
    }) }
  }, [applied.dates, selected, workspace])
  const evidenceRecords = workspace?.evidence.records.filter((record) => record.watershedId === selected?.id && inDateRange(record.capturedAt, applied.dates)) ?? []
  const interventionRecords = workspace?.interventions.records.filter((record) => record.watershedId === selected?.id && inDateRange(record.actualStart ?? record.plannedStart, applied.dates)) ?? []
  const ndvi = selected && workspace ? latestIndicator(workspace, selected.id, "NDVI", applied.dates) : undefined
  const waterIndex = selected && workspace ? latestIndicator(workspace, selected.id, "NDWI / Water Index", applied.dates) : undefined
  const latestChange = selected && workspace ? workspace.analytics.comparisons.filter((item) => item.watershedId === selected.id && inDateRange(item.createdAt, applied.dates)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : undefined
  const fitBounds = useMemo(() => boundsFor(selectedFeatures), [selectedFeatures])

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (draft.dates.start && draft.dates.end && draft.dates.start > draft.dates.end) { setDateError("End date must be on or after the start date."); return }
    setDateError(undefined); setApplied(draft)
    const nextParams = new URLSearchParams(searchParams)
    if (draft.watershed) nextParams.set("watershed", draft.watershed); else nextParams.delete("watershed")
    if (draft.dates.start) nextParams.set("from", draft.dates.start); else nextParams.delete("from")
    if (draft.dates.end) nextParams.set("to", draft.dates.end); else nextParams.delete("to")
    setSearchParams(nextParams, { replace: true })
  }
  function resetFilters() {
    setDraft(blankFilters); setApplied(blankFilters); setDateError(undefined)
    const nextParams = new URLSearchParams(searchParams)
    for (const key of ["watershed", "from", "to"]) nextParams.delete(key)
    setSearchParams(nextParams, { replace: true })
  }

  const header = <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "GIS" }, { label: "Watersheds" }]} />} description="Explore authorized watershed boundaries, linked field evidence, intervention locations, and recorded indicators." eyebrow="GIS workspace" title="Watershed Explorer" />
  if (configurationError) return <div className="page-section">{header}<ErrorState description="Configure Supabase to load watershed and linked evidence records." title="Supabase setup required" /></div>
  if (loading) return <div className="page-section">{header}<Card><LoadingState label="Loading watershed, GIS, and evidence records" rows={5} /></Card></div>
  if (loadError) return <div className="page-section">{header}<ErrorState description={loadError} title="Watershed Explorer unavailable" /></div>

  return <div className="page-section">
    {header}
    <Card as="section" aria-label="Watershed explorer filters"><form className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.1fr_1.7fr_auto]" onSubmit={applyFilters}>
      <Select label="State" onChange={(event) => setDraft((current) => ({ ...current, state: event.target.value, district: "", watershed: "" }))} options={stateOptions} placeholder="All states" value={draft.state} />
      <Select label="District" onChange={(event) => setDraft((current) => ({ ...current, district: event.target.value, watershed: "" }))} options={districtOptions} placeholder="All districts" value={draft.district} />
      <Select label="Watershed" onChange={(event) => setDraft((current) => ({ ...current, watershed: event.target.value }))} options={draftWatersheds.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} placeholder="All watersheds" value={draft.watershed} />
      <DateRangePicker className="sm:col-span-2 xl:col-span-1" error={dateError} label="Date range" onChange={(dates) => { setDraft((current) => ({ ...current, dates })); setDateError(undefined) }} value={draft.dates} />
      <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1"><Button className="flex-1" leadingIcon={Check} type="submit">Apply Filters</Button><Button leadingIcon={RefreshCw} onClick={resetFilters} variant="secondary">Reset</Button></div>
    </form><p className="mt-3 text-xs text-muted">Counts and indicators use records linked to the selected watershed and date range. Missing measurements are shown as not recorded.</p></Card>

    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,22rem)]">
      <section aria-label="Watershed map" className="min-w-0 space-y-2"><div className="flex flex-wrap items-center justify-between gap-2 px-1"><h2 className="text-base font-semibold text-ink">Boundary & field locations</h2><div className="flex flex-wrap gap-2"><Badge variant="info">{selected?.code ?? "No selection"}</Badge><Badge variant="neutral">{evidenceRecords.length} evidence · {interventionRecords.length} interventions</Badge></div></div>
        {selected ? (selectedFeatures.features.length ? <MapView className="h-[min(68vh,54rem)] min-h-[30rem]" data={selectedFeatures} fitBounds={fitBounds} initialView={{ center: [78.96, 20.59], zoom: 8 }} /> : <div className="grid min-h-[30rem] place-items-center rounded-xl border border-line bg-white p-6"><EmptyState description="This watershed has no mapped boundary or linked photo/intervention geometry in the authorized records." icon={MapPinned} title="No mapped features" /></div>) : <div className="grid min-h-[30rem] place-items-center rounded-xl border border-line bg-white p-6"><EmptyState description="Select a watershed to view its linked GIS features." icon={MapPinned} title="No watershed selected" /></div>}
      </section>

      <aside className="space-y-4" aria-label="Selected watershed information">{selected ? <>
        <Card><SectionHeader actions={<Badge variant={selected.status === "ACTIVE" ? "success" : "neutral"} dot>{selected.status}</Badge>} description="Administrative and monitoring summary from authorized records." title="Watershed details" /><dl className="mt-4 divide-y divide-line">
          {[["Watershed ID", selected.id], ["Watershed code", selected.code], ["Watershed name", selected.name], ["District", selected.district ?? "Not linked"], ["State", selected.state ?? "Not linked"], ["Area", selected.areaSqKm === null || !Number.isFinite(selected.areaSqKm) ? "Not recorded" : `${selected.areaSqKm.toLocaleString()} km²`], ["Villages", String(selected.villageCount)], ["Field observations", String(evidenceRecords.length)], ["Interventions", String(interventionRecords.length)], ["Last updated", formatDate(selected.lastUpdated)]].map(([label, value]) => <div className="flex justify-between gap-3 py-2 first:pt-0" key={label}><dt className="text-xs text-muted">{label}</dt><dd className="max-w-[65%] break-all text-right text-xs font-medium text-ink">{value}</dd></div>)}
        </dl></Card>
        <Card><SectionHeader description="Latest recorded indicator in the selected period." title="Key indicators" /><div className="mt-4 space-y-3"><IndicatorRow icon={Sprout} label="NDVI" value={ndvi ? `${ndvi.value} ${ndvi.unit}` : "Not recorded"} date={ndvi?.observedAt ?? null} /><IndicatorRow icon={Activity} label="Water Index" value={waterIndex ? `${waterIndex.value} ${waterIndex.unit}` : "Not recorded"} date={waterIndex?.observedAt ?? null} /><IndicatorRow icon={Activity} label="Observed change" value={latestChange?.observedChange === null || latestChange?.observedChange === undefined ? "Not recorded" : String(latestChange.observedChange)} date={latestChange?.createdAt ?? null} /></div></Card>
        <Card><SectionHeader title="Quick actions" /><div className="mt-3 grid gap-2">{[
          ["/gis/map-layers", "Open GIS map", MapPinned], ["/gis/field-evidence", "View evidence", Camera], ["/analysis/interventions", "View interventions", Workflow], ["/analysis/satellite-data", "Satellite data", Satellite], ["/analysis/analytics", "Run analysis", BarChart3], ["/analysis/change-detection", "Change detection", Activity], ["/intelligence/ai-insights", "AI Insights", Sprout], ["/reports", "Reports", FileText],
        ].map(([path, label, Icon]) => <Link className="flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-ink hover:border-brand-300 hover:bg-blue-50" key={path as string} to={buildScopedPath(path as string, selected.id, applied.dates)}><Icon aria-hidden="true" className="size-4 text-brand-800" />{label as string}</Link>)}</div></Card>
      </> : <Card><EmptyState description="No watershed records match your authorized scope and selected filters." icon={MapPinned} title="No watershed available" /></Card>}</aside>
    </div>
  </div>
}

function IndicatorRow({ icon: Icon, label, value, date }: { icon: typeof Sprout; label: string; value: string; date: string | null }) {
  return <div className="flex items-center gap-3 rounded-lg bg-canvas p-3"><span className="flex size-9 items-center justify-center rounded-lg bg-white text-brand-800"><Icon aria-hidden="true" className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-xs text-muted">{label}</p><p className="text-sm font-semibold text-ink">{value}</p><p className="text-[10px] text-muted">{date ? `Observed ${formatDate(date)}` : "No measurement recorded"}</p></div></div>
}

export default WatershedExplorer
