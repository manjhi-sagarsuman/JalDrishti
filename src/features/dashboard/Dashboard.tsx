import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Camera, Check, ClipboardList, Droplets, FileText, Map as MapIcon, Mountain, Plus, RefreshCw, Satellite, Sprout, Waves } from "lucide-react"
import { Link } from "react-router-dom"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { Badge, Button, Card, DateRangePicker, KpiCard, PageHeader, SectionHeader, Select, StatusBadge, type DateRange } from "../../components/ui"
import { MapView, type MapFeatureCollection } from "../../maps"
import { loadWatershedExplorerWorkspace } from "../../services/watershedExplorerService"

interface DashboardWatershed {
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

interface DashboardEvidence {
  id: string
  title: string
  watershedId: string
  location: string
  time: string
  status: string
}

interface DashboardActivity {
  id: string
  title: string
  detail: string
  time: string
  color: string
}

interface DashboardFilters {
  state: string
  district: string
  watershed: string
  dates: DateRange
}

const emptyFilters: DashboardFilters = { state: "", district: "", watershed: "", dates: { start: "", end: "" } }

function Dashboard() {
  const [draft, setDraft] = useState<DashboardFilters>(emptyFilters)
  const [applied, setApplied] = useState<DashboardFilters>(emptyFilters)
  const [watersheds, setWatersheds] = useState<DashboardWatershed[]>([])
  const [workspace, setWorkspace] = useState<Awaited<ReturnType<typeof loadWatershedExplorerWorkspace>> | null>(null)
  const [evidence, setEvidence] = useState<DashboardEvidence[]>([])
  const [activities, setActivities] = useState<DashboardActivity[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | undefined>()

  useEffect(() => {
    let active = true
    void loadWatershedExplorerWorkspace().then((workspace) => {
      if (!active) return
      setWorkspace(workspace)
      const interventionsByWatershed = new Map<string, number>()
      for (const intervention of workspace.interventions.records) interventionsByWatershed.set(intervention.watershedId, (interventionsByWatershed.get(intervention.watershedId) ?? 0) + 1)
      const indicatorsByWatershed = new Map<string, typeof workspace.analytics.indicators>()
      for (const indicator of workspace.analytics.indicators) indicatorsByWatershed.set(indicator.watershedId, [...(indicatorsByWatershed.get(indicator.watershedId) ?? []), indicator])
      const nextWatersheds = workspace.watersheds.map((watershed): DashboardWatershed => {
        const indicators = indicatorsByWatershed.get(watershed.id) ?? []
        const vegetation = indicators.find((indicator) => indicator.code.toUpperCase().includes("NDVI"))
        const water = indicators.find((indicator) => indicator.code.toUpperCase().includes("NDWI") || indicator.code.toUpperCase().includes("WATER"))
        return {
          id: watershed.id,
          name: watershed.name,
          state: watershed.state ?? "State unavailable",
          district: watershed.district ?? "District unavailable",
          areaHectares: Math.round((watershed.areaSqKm ?? 0) * 100) / 100,
          observations: indicators.length,
          interventions: interventionsByWatershed.get(watershed.id) ?? 0,
          vegetation: vegetation ? `${vegetation.value.toFixed(2)} ${vegetation.unit}` : "Not recorded",
          water: water ? `${water.value.toFixed(2)} ${water.unit}` : "Not recorded",
          status: watershed.status === "ACTIVE" ? "On track" : watershed.status === "PLANNED" ? "Monitoring" : "Needs review",
        }
      })
      const nextEvidence = workspace.evidence.records.slice(0, 3).map((item) => ({ id: item.id, title: item.fileName, watershedId: item.watershedId, location: item.watershedName, time: item.capturedAt ?? item.createdAt, status: item.verificationStatus }))
      const nextActivities = workspace.interventions.records.slice(0, 3).map((item, index) => ({ id: item.id, title: "Intervention record", detail: `${item.watershedName} · ${item.name}`, time: item.updatedAt, color: ["bg-blue-600", "bg-green-700", "bg-amber-600"][index] ?? "bg-blue-600" }))
      setWatersheds(nextWatersheds)
      setEvidence(nextEvidence)
      setActivities(nextActivities)
      setSelectedId(nextWatersheds[0]?.id ?? "")
      setLoadError(null)
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : "Maharashtra data could not be loaded.")
    })
    return () => { active = false }
  }, [])

  const stateOptions = [...new Set(watersheds.map((item) => item.state))].map((value) => ({ value, label: value }))
  const draftDistricts = [...new Set(watersheds.filter((item) => !draft.state || item.state === draft.state).map((item) => item.district))].map((value) => ({ value, label: value }))
  const draftWatersheds = watersheds.filter((item) => (!draft.state || item.state === draft.state) && (!draft.district || item.district === draft.district))
  const visibleWatersheds = useMemo(() => watersheds.filter((item) =>
    (!applied.state || item.state === applied.state) &&
    (!applied.district || item.district === applied.district) &&
    (!applied.watershed || item.id === applied.watershed),
  ), [applied, watersheds])
  const selectedWatershed = visibleWatersheds.find((item) => item.id === selectedId) ?? visibleWatersheds[0]
  const totalObservations = visibleWatersheds.reduce((sum, item) => sum + item.observations, 0)
  const totalInterventions = visibleWatersheds.reduce((sum, item) => sum + item.interventions, 0)
  const totalArea = visibleWatersheds.reduce((sum, item) => sum + item.areaHectares, 0)
  const visibleEvidence = evidence.filter((item) => visibleWatersheds.some((watershed) => watershed.id === item.watershedId)).slice(0, 3)
  const mapData = useMemo<MapFeatureCollection>(() => {
    if (!workspace) return { type: "FeatureCollection", features: [] }
    const visibleIds = new Set(visibleWatersheds.map((watershed) => watershed.id))
    return {
      type: "FeatureCollection",
      features: workspace.features.features.filter((feature) => visibleIds.has(String(feature.properties?.watershed_id ?? ""))),
    }
  }, [visibleWatersheds, workspace])

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (draft.dates.start && draft.dates.end && draft.dates.start > draft.dates.end) {
      setDateError("End date must be on or after the start date.")
      return
    }
    setDateError(undefined)
    setApplied(draft)
    setSelectedId(draft.watershed || watersheds.find((item) => (!draft.state || item.state === draft.state) && (!draft.district || item.district === draft.district))?.id || "")
  }

  function resetFilters() {
    setDraft(emptyFilters)
    setApplied(emptyFilters)
    setDateError(undefined)
    setSelectedId(watersheds[0]?.id ?? "")
  }

  return (
    <div className="page-section">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: "Dashboard" }]} />}
        description="A consolidated view of watershed monitoring, field evidence, and intervention progress."
        eyebrow="Monitoring overview"
        title="Watershed Dashboard"
        actions={<Badge className="w-fit" variant={loadError ? "warning" : "info"} dot>{loadError ? "DATA UNAVAILABLE" : "MAHARASHTRA COVERAGE"}</Badge>}
      />

      <Card as="section" className="p-4 sm:p-5" aria-label="Dashboard filters">
        <form className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.1fr_1.7fr_auto]" onSubmit={applyFilters}>
          <Select label="State" onChange={(event) => setDraft((value) => ({ ...value, state: event.target.value, district: "", watershed: "" }))} options={stateOptions} placeholder="All states" value={draft.state} />
          <Select label="District" onChange={(event) => setDraft((value) => ({ ...value, district: event.target.value, watershed: "" }))} options={draftDistricts} placeholder="All districts" value={draft.district} />
          <Select label="Watershed" onChange={(event) => setDraft((value) => ({ ...value, watershed: event.target.value }))} options={draftWatersheds.map((item) => ({ value: item.id, label: item.name }))} placeholder="All watersheds" value={draft.watershed} />
          <DateRangePicker className="sm:col-span-2 xl:col-span-1" error={dateError} label="Date range" onChange={(dates) => { setDraft((value) => ({ ...value, dates })); setDateError(undefined) }} value={draft.dates} />
          <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-1">
            <Button className="flex-1" leadingIcon={Check} type="submit">Apply Filters</Button>
            <Button aria-label="Reset filters" leadingIcon={RefreshCw} onClick={resetFilters} variant="secondary">Reset</Button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted">Date range is validated and retained. Metrics reflect records available through the configured data source.</p>
        {loadError && <p className="mt-2 text-sm text-amber-800">{loadError}</p>}
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard detail="Within selected filters" icon={Mountain} label="Total Watersheds" tone="blue" value={visibleWatersheds.length.toLocaleString()} />
        <KpiCard detail="Recorded field observations" icon={Camera} label="Field Observations" tone="green" value={totalObservations.toLocaleString()} />
        <KpiCard detail="Across visible watersheds" icon={ClipboardList} label="Interventions" tone="amber" value={totalInterventions.toLocaleString()} />
        <KpiCard detail="Hectares in selected area" icon={MapIcon} label="Area Covered" tone="neutral" value={`${totalArea.toLocaleString()} ha`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.85fr)]">
        <Card className="min-w-0">
          <SectionHeader actions={<Badge variant="info">{visibleWatersheds.length} areas</Badge>} description="Select a numbered area to inspect its summary." title="Watershed map" />
          <div className="mt-4"><MapView className="h-80 min-h-80 sm:h-100" data={mapData} initialView={{ center: [78.96, 20.59], zoom: 5 }} /></div>
        </Card>

        <Card className="min-w-0">
          <SectionHeader description="Summary for the selected area." title="Selected watershed" />
          {selectedWatershed ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-brand-900 p-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs text-blue-100">{selectedWatershed.state}</p><h3 className="mt-1 text-lg font-semibold">{selectedWatershed.name}</h3><p className="mt-1 text-sm text-blue-100/80">{selectedWatershed.district}</p></div>
                  <StatusBadge status={selectedWatershed.status === "On track" ? "active" : selectedWatershed.status === "Needs review" ? "critical" : "pending"} labels={{ active: "On track", critical: "Needs review", pending: "Monitoring" }} />
                </div>
                <p className="mt-4 text-xs text-blue-100/75">SOURCE RECORDS</p>
              </div>
              <h3 className="text-sm font-semibold text-ink">Key indicators</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line p-3"><p className="text-xs text-muted">Area covered</p><p className="mt-1 text-lg font-bold text-ink">{selectedWatershed.areaHectares.toLocaleString()} ha</p></div>
                <div className="rounded-lg border border-line p-3"><p className="text-xs text-muted">Field observations</p><p className="mt-1 text-lg font-bold text-ink">{selectedWatershed.observations}</p></div>
                <div className="rounded-lg border border-line p-3"><p className="flex items-center gap-1 text-xs text-muted"><Sprout aria-hidden="true" className="size-3.5 text-green-700" /> Vegetation trend</p><p className={`mt-1 inline-flex items-center gap-1 text-lg font-bold ${selectedWatershed.vegetation.startsWith("−") ? "text-amber-800" : "text-green-800"}`}>{selectedWatershed.vegetation.startsWith("−") ? <ArrowDownRight className="size-4" /> : <ArrowUpRight className="size-4" />}{selectedWatershed.vegetation}</p></div>
                <div className="rounded-lg border border-line p-3"><p className="flex items-center gap-1 text-xs text-muted"><Droplets aria-hidden="true" className="size-3.5 text-blue-700" /> Water indicator</p><p className="mt-1 text-lg font-bold text-ink">{selectedWatershed.water}</p></div>
              </div>
              <Link className="inline-flex items-center gap-1 text-sm font-semibold text-brand-800 hover:text-brand-900" to="/gis/watersheds">View watershed details <ArrowRight aria-hidden="true" className="size-4" /></Link>
            </div>
          ) : <p className="mt-5 text-sm text-muted">No watershed matches the selected filters.</p>}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <SectionHeader actions={<Link className="text-sm font-semibold text-brand-800 hover:text-brand-900" to="/gis/field-evidence">View all <ArrowRight aria-hidden="true" className="ml-1 inline size-4" /></Link>} description="Latest submitted observations in the current filter scope." title="Recent field evidence" />
          <div className="mt-4 space-y-3">
            {visibleEvidence.map((item, index) => (
              <article className="flex gap-3 rounded-xl border border-line p-3" key={item.id}>
                <div aria-label="Geo-tagged evidence" className={`flex size-16 shrink-0 items-center justify-center rounded-lg ${index === 1 ? "bg-green-50 text-green-800" : "bg-blue-50 text-brand-800"}`}><Camera aria-hidden="true" className="size-6" /></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="truncate text-sm font-semibold text-ink">{item.title}</h3><Badge variant={item.status === "Verified" ? "success" : "warning"}>{item.status}</Badge></div><p className="mt-1 text-xs text-muted">{item.location}</p><p className="mt-1 text-xs text-muted">{item.time}</p></div>
              </article>
            ))}
            {visibleEvidence.length === 0 && <p className="py-5 text-center text-sm text-muted">No evidence matches these filters.</p>}
          </div>
        </Card>

        <Card>
          <SectionHeader description="Current review state by selected area." title="Watershed status" />
          <div className="mt-4 divide-y divide-line">
            {visibleWatersheds.map((item) => (
              <button aria-pressed={selectedWatershed?.id === item.id} className={`flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0 ${selectedWatershed?.id === item.id ? "" : "opacity-90"}`} key={item.id} onClick={() => setSelectedId(item.id)} type="button">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-800"><Waves aria-hidden="true" className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{item.name}</span><span className="block truncate text-xs text-muted">{item.district} · {item.areaHectares.toLocaleString()} ha</span></span>
                <StatusBadge status={item.status === "On track" ? "active" : item.status === "Needs review" ? "critical" : "pending"} labels={{ active: "On track", critical: "Review", pending: "Monitoring" }} />
              </button>
            ))}
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[11px] text-muted">Statuses reflect recorded values.</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
        <Card>
          <SectionHeader description="Recent activity in the workspace." title="Recent activities" />
          <ol className="mt-5 space-y-5">
            {activities.filter((item) => visibleWatersheds.some((watershed) => item.detail.includes(watershed.name))).map((item) => (
              <li className="flex gap-3" key={item.id}><span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-full ${item.color}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{item.title}</p><p className="mt-0.5 text-xs text-muted">{item.detail}</p></div><time className="shrink-0 text-right text-[11px] text-muted">{item.time}</time></li>
            ))}
          </ol>
          <p className="mt-5 border-t border-line pt-3 text-[11px] text-muted">Source records are shown with their available metadata.</p>
        </Card>

        <Card>
          <SectionHeader description="Common monitoring tasks." title="Quick actions" />
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link className="group flex min-h-16 items-center gap-3 rounded-xl border border-line p-3 hover:border-brand-300 hover:bg-blue-50/50" to="/gis/field-evidence"><span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-brand-800"><Plus className="size-4" /></span><span className="min-w-0 flex-1 text-sm font-semibold text-ink">Add Field Evidence</span><ArrowRight className="size-4 text-muted group-hover:text-brand-800" /></Link>
            <Link className="group flex min-h-16 items-center gap-3 rounded-xl border border-line p-3 hover:border-brand-300 hover:bg-blue-50/50" to="/gis/watersheds"><span className="flex size-9 items-center justify-center rounded-lg bg-green-50 text-green-800"><MapIcon className="size-4" /></span><span className="min-w-0 flex-1 text-sm font-semibold text-ink">View Map</span><ArrowRight className="size-4 text-muted group-hover:text-brand-800" /></Link>
            <Link className="group flex min-h-16 items-center gap-3 rounded-xl border border-line p-3 hover:border-brand-300 hover:bg-blue-50/50" to="/analysis/analytics"><span className="flex size-9 items-center justify-center rounded-lg bg-amber-50 text-amber-800"><Satellite className="size-4" /></span><span className="min-w-0 flex-1 text-sm font-semibold text-ink">Run Analysis</span><ArrowRight className="size-4 text-muted group-hover:text-brand-800" /></Link>
            <Link className="group flex min-h-16 items-center gap-3 rounded-xl border border-line p-3 hover:border-brand-300 hover:bg-blue-50/50" to="/reports"><span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><FileText className="size-4" /></span><span className="min-w-0 flex-1 text-sm font-semibold text-ink">Generate Report</span><ArrowRight className="size-4 text-muted group-hover:text-brand-800" /></Link>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-xs text-muted"><Activity aria-hidden="true" className="size-4 shrink-0" /> Actions open their module workspace.</div>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
