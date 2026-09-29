import { useMemo, useState, type FormEvent } from "react"
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Camera, Check, ClipboardList, Droplets, FileText, Map, MapPin, Maximize2, Mountain, Plus, RefreshCw, Satellite, Sprout, Waves } from "lucide-react"
import { Link } from "react-router-dom"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { Badge, Button, Card, DateRangePicker, KpiCard, PageHeader, SectionHeader, Select, StatusBadge, type DateRange } from "../../components/ui"
import { demoActivities, demoEvidence, demoWatersheds } from "./demoDashboard"

interface DashboardFilters {
  state: string
  district: string
  watershed: string
  dates: DateRange
}

const emptyFilters: DashboardFilters = { state: "", district: "", watershed: "", dates: { start: "", end: "" } }

function WatershedMapPlaceholder({ selectedId, visibleIds, onSelect }: { selectedId: string; visibleIds: string[]; onSelect: (id: string) => void }) {
  const pins = [
    { id: "demo-01", label: "01", x: "33%", y: "37%", area: "left-[16%] top-[15%] h-[44%] w-[32%]" },
    { id: "demo-02", label: "02", x: "61%", y: "61%", area: "left-[46%] top-[38%] h-[43%] w-[32%]" },
    { id: "demo-03", label: "03", x: "76%", y: "28%", area: "left-[66%] top-[8%] h-[38%] w-[25%]" },
  ]

  return (
    <div className="relative min-h-[20rem] overflow-hidden rounded-xl border border-line bg-[#eef4f2] sm:min-h-[25rem]">
      <div aria-hidden="true" className="absolute inset-0 opacity-70" style={{ backgroundImage: "linear-gradient(30deg, transparent 48%, #d5e2dc 49%, #d5e2dc 50%, transparent 51%), linear-gradient(120deg, transparent 48%, #d5e2dc 49%, #d5e2dc 50%, transparent 51%)", backgroundSize: "54px 54px" }} />
      <svg aria-hidden="true" className="absolute inset-0 size-full" preserveAspectRatio="none" viewBox="0 0 900 450">
        <path d="M-20 120C150 80 156 182 294 152s136-100 278-56 165 134 350 76M-30 198c156-48 201 60 332 26s145-90 260-48 182 98 366 50M-20 301c176-61 203 46 333 4s168-110 295-67 170 112 322 66M-30 389c147-52 214 41 347 1s171-98 291-58 185 98 334 58" fill="none" stroke="#c7d8d0" strokeWidth="2" />
        <path d="M45 0c14 77 105 69 116 144s-48 106-7 166 108 40 93 140M760-20c-29 69-5 116-51 166s-97 54-68 118 86 83 63 202" fill="none" stroke="#b2d6dc" strokeWidth="4" />
        <path d="M160 215c75-46 143-39 183 7s27 92-23 123-140 18-169-25-37-74 9-105Zm303 70c43-67 125-84 180-46s54 105 6 145-131 43-174 4-38-66-12-103Zm147-207c49-39 113-35 147 1s31 88-8 118-98 34-137 1-43-84-2-120Z" fill="#d4e5d4" fillOpacity=".72" stroke="#54896b" strokeDasharray="7 5" strokeWidth="3" />
      </svg>
      {pins.filter((pin) => visibleIds.includes(pin.id)).map((pin) => (
        <button
          aria-label={`Select Demo Watershed ${pin.label}`}
          aria-pressed={selectedId === pin.id}
          className={`absolute z-10 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-bold shadow-lg transition ${selectedId === pin.id ? "border-white bg-brand-800 text-white ring-4 ring-brand-800/20" : "border-white bg-white text-brand-800 hover:bg-blue-50"}`}
          key={pin.id}
          onClick={() => onSelect(pin.id)}
          style={{ left: pin.x, top: pin.y }}
          type="button"
        >
          {pin.label}
        </button>
      ))}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-line bg-white/95 px-3 py-2 text-xs font-medium text-ink shadow-sm">
        <MapPin aria-hidden="true" className="size-4 text-brand-700" /> Illustrative watershed overview
      </div>
      <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-line bg-white/95 px-3 py-2 text-[11px] font-medium text-muted shadow-sm">No operational boundaries · map engine not connected</div>
      <span className="absolute bottom-3 right-3 z-10 rounded bg-white/90 px-2 py-1 text-[10px] text-muted">DEMO MAP</span>
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
        <button aria-label="Map controls placeholder" className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-white text-muted shadow-sm" type="button"><Maximize2 aria-hidden="true" className="size-4" /></button>
      </div>
    </div>
  )
}

function Dashboard() {
  const [draft, setDraft] = useState<DashboardFilters>(emptyFilters)
  const [applied, setApplied] = useState<DashboardFilters>(emptyFilters)
  const [selectedId, setSelectedId] = useState("demo-01")
  const [dateError, setDateError] = useState<string | undefined>()

  const stateOptions = [...new Set(demoWatersheds.map((item) => item.state))].map((value) => ({ value, label: value }))
  const draftDistricts = [...new Set(demoWatersheds.filter((item) => !draft.state || item.state === draft.state).map((item) => item.district))].map((value) => ({ value, label: value }))
  const draftWatersheds = demoWatersheds.filter((item) => (!draft.state || item.state === draft.state) && (!draft.district || item.district === draft.district))
  const visibleWatersheds = useMemo(() => demoWatersheds.filter((item) =>
    (!applied.state || item.state === applied.state) &&
    (!applied.district || item.district === applied.district) &&
    (!applied.watershed || item.id === applied.watershed),
  ), [applied])
  const selectedWatershed = visibleWatersheds.find((item) => item.id === selectedId) ?? visibleWatersheds[0]
  const totalObservations = visibleWatersheds.reduce((sum, item) => sum + item.observations, 0)
  const totalInterventions = visibleWatersheds.reduce((sum, item) => sum + item.interventions, 0)
  const totalArea = visibleWatersheds.reduce((sum, item) => sum + item.areaHectares, 0)
  const visibleEvidence = demoEvidence.filter((item) => visibleWatersheds.some((watershed) => watershed.id === item.watershedId)).slice(0, 3)

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (draft.dates.start && draft.dates.end && draft.dates.start > draft.dates.end) {
      setDateError("End date must be on or after the start date.")
      return
    }
    setDateError(undefined)
    setApplied(draft)
    setSelectedId(draft.watershed || demoWatersheds.find((item) => (!draft.state || item.state === draft.state) && (!draft.district || item.district === draft.district))?.id || "demo-01")
  }

  function resetFilters() {
    setDraft(emptyFilters)
    setApplied(emptyFilters)
    setDateError(undefined)
    setSelectedId("demo-01")
  }

  return (
    <div className="page-section">
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: "Dashboard" }]} />}
        description="A consolidated view of watershed monitoring, field evidence, and intervention progress."
        eyebrow="Monitoring overview"
        title="Watershed Dashboard"
        actions={<Badge className="w-fit" variant="warning" dot>DEMO DATA — REPLACE LATER</Badge>}
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
        <p className="mt-3 text-xs text-muted">Date range is validated and retained. DEMO DATA — REPLACE LATER uses static snapshots, so date selection does not recalculate the sample totals.</p>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard detail="Within selected filters" icon={Mountain} label="Total Watersheds" tone="blue" value={visibleWatersheds.length.toLocaleString()} />
        <KpiCard detail="Recorded field observations" icon={Camera} label="Field Observations" tone="green" value={totalObservations.toLocaleString()} />
        <KpiCard detail="Across visible watersheds" icon={ClipboardList} label="Interventions" tone="amber" value={totalInterventions.toLocaleString()} />
        <KpiCard detail="Hectares in selected area" icon={Map} label="Area Covered" tone="neutral" value={`${totalArea.toLocaleString()} ha`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.85fr)]">
        <Card className="min-w-0">
          <SectionHeader actions={<Badge variant="info">{visibleWatersheds.length} areas</Badge>} description="Select a numbered area to inspect its summary." title="Watershed map" />
          <div className="mt-4"><WatershedMapPlaceholder onSelect={setSelectedId} selectedId={selectedWatershed?.id ?? ""} visibleIds={visibleWatersheds.map((item) => item.id)} /></div>
        </Card>

        <Card className="min-w-0">
          <SectionHeader description="Summary for the selected demonstration area." title="Selected watershed" />
          {selectedWatershed ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-brand-900 p-4 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs text-blue-100">{selectedWatershed.state}</p><h3 className="mt-1 text-lg font-semibold">{selectedWatershed.name}</h3><p className="mt-1 text-sm text-blue-100/80">{selectedWatershed.district}</p></div>
                  <StatusBadge status={selectedWatershed.status === "On track" ? "active" : selectedWatershed.status === "Needs review" ? "critical" : "pending"} labels={{ active: "On track", critical: "Needs review", pending: "Monitoring" }} />
                </div>
                <p className="mt-4 text-xs text-blue-100/75">DEMO DATA — REPLACE LATER</p>
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
                <div aria-label="Demonstration photo placeholder" className={`flex size-16 shrink-0 items-center justify-center rounded-lg ${index === 1 ? "bg-green-50 text-green-800" : "bg-blue-50 text-brand-800"}`}><Camera aria-hidden="true" className="size-6" /><span className="sr-only">DEMO DATA — REPLACE LATER</span></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="truncate text-sm font-semibold text-ink">{item.title}</h3><Badge variant={item.status === "Verified" ? "success" : "warning"}>{item.status}</Badge></div><p className="mt-1 text-xs text-muted">{item.watershedId.replace("demo-", "Demo Watershed ")} · {item.location}</p><p className="mt-1 text-xs text-muted">{item.time} · DEMO</p></div>
              </article>
            ))}
            {visibleEvidence.length === 0 && <p className="py-5 text-center text-sm text-muted">No demonstration evidence matches these filters.</p>}
          </div>
        </Card>

        <Card>
          <SectionHeader description="Current review state by demonstration area." title="Watershed status" />
          <div className="mt-4 divide-y divide-line">
            {visibleWatersheds.map((item) => (
              <button aria-pressed={selectedWatershed?.id === item.id} className={`flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0 ${selectedWatershed?.id === item.id ? "" : "opacity-90"}`} key={item.id} onClick={() => setSelectedId(item.id)} type="button">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-800"><Waves aria-hidden="true" className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-ink">{item.name}</span><span className="block truncate text-xs text-muted">{item.district} · {item.areaHectares.toLocaleString()} ha</span></span>
                <StatusBadge status={item.status === "On track" ? "active" : item.status === "Needs review" ? "critical" : "pending"} labels={{ active: "On track", critical: "Review", pending: "Monitoring" }} />
              </button>
            ))}
          </div>
          <p className="mt-4 border-t border-line pt-3 text-[11px] text-muted">DEMO DATA — REPLACE LATER · Statuses are illustrative only.</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)]">
        <Card>
          <SectionHeader description="Recent activity in the demonstration workspace." title="Recent activities" />
          <ol className="mt-5 space-y-5">
            {demoActivities.filter((item) => visibleWatersheds.some((watershed) => item.detail.includes(watershed.name))).map((item) => (
              <li className="flex gap-3" key={item.id}><span aria-hidden="true" className={`mt-1.5 size-2.5 shrink-0 rounded-full ${item.color}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{item.title}</p><p className="mt-0.5 text-xs text-muted">{item.detail}</p></div><time className="shrink-0 text-right text-[11px] text-muted">{item.time}</time></li>
            ))}
          </ol>
          <p className="mt-5 border-t border-line pt-3 text-[11px] text-muted">DEMO DATA — REPLACE LATER</p>
        </Card>

        <Card>
          <SectionHeader description="Common monitoring tasks." title="Quick actions" />
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link className="group flex min-h-16 items-center gap-3 rounded-xl border border-line p-3 hover:border-brand-300 hover:bg-blue-50/50" to="/gis/field-evidence"><span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-brand-800"><Plus className="size-4" /></span><span className="min-w-0 flex-1 text-sm font-semibold text-ink">Add Field Evidence</span><ArrowRight className="size-4 text-muted group-hover:text-brand-800" /></Link>
            <Link className="group flex min-h-16 items-center gap-3 rounded-xl border border-line p-3 hover:border-brand-300 hover:bg-blue-50/50" to="/gis/watersheds"><span className="flex size-9 items-center justify-center rounded-lg bg-green-50 text-green-800"><Map className="size-4" /></span><span className="min-w-0 flex-1 text-sm font-semibold text-ink">View Map</span><ArrowRight className="size-4 text-muted group-hover:text-brand-800" /></Link>
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
