import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { Activity, ArrowLeft, CalendarDays, Camera, ClipboardList, FilePlus2, MapPin, Plus, RefreshCw, Satellite, Workflow } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { ProvenancePanel } from "../../components/ProvenancePanel"
import { Badge, Button, Card, DateRangePicker, EmptyState, ErrorState, Input, LoadingState, Modal, PageHeader, SectionHeader, Select, StatusBadge, type DateRange, type SelectOption } from "../../components/ui"
import { MapView, type MapFeatureCollection } from "../../maps"
import { useAuth } from "../../hooks/useAuth"
import { isWithinRouteDateRange, readRouteDateRange } from "../../lib/routeScope"
import { createIntervention, interventionTypes, loadInterventionDirectory, type InterventionDirectory, type InterventionRecord, type InterventionStatus } from "../../services/interventionService"

const statusLabels: Record<InterventionStatus, string> = { PLANNED: "Planned", APPROVED: "Approved", IN_PROGRESS: "In progress", COMPLETED: "Completed", CANCELLED: "Cancelled" }
const noInterventions: InterventionRecord[] = []
const statusValues: InterventionStatus[] = ["PLANNED", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]

function formatDate(value: string | null) {
  if (!value) return "Not recorded"
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { dateStyle: "medium" })
}

function statusKind(status: InterventionStatus): "active" | "pending" | "completed" | "inactive" {
  if (status === "COMPLETED") return "completed"
  if (status === "CANCELLED") return "inactive"
  if (status === "IN_PROGRESS") return "active"
  return "pending"
}

function pointFor(record: InterventionRecord): [number, number] | null {
  const location = record.location
  if (typeof location === "object" && location !== null && "type" in location && location.type === "Point" && "coordinates" in location && Array.isArray(location.coordinates)) {
    const [longitude, latitude] = location.coordinates
    if (typeof longitude === "number" && typeof latitude === "number") return [longitude, latitude]
  }
  if (typeof location === "string") {
    const match = location.match(/(?:SRID=\d+;)?POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i)
    if (match) return [Number(match[1]), Number(match[2])]
  }
  return null
}

function distanceKm(a: [number, number], b: [number, number]) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const [lon1, lat1] = a
  const [lon2, lat2] = b
  const dLat = radians(lat2 - lat1)
  const dLon = radians(lon2 - lon1)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

function InterventionForm({ directory, initialWatershedId, onClose, onCreated }: { directory: InterventionDirectory; initialWatershedId: string; onClose: () => void; onCreated: (id: string) => void }) {
  const { session } = useAuth()
  const [name, setName] = useState("")
  const [typeId, setTypeId] = useState("")
  const [watershedId, setWatershedId] = useState(initialWatershedId)
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [implementationDate, setImplementationDate] = useState("")
  const [status, setStatus] = useState<InterventionStatus>("PLANNED")
  const [description, setDescription] = useState("")
  const [agency, setAgency] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const watershedOptions = directory.watersheds.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))
  const typeOptions: SelectOption[] = directory.types.map((item) => ({ value: item.id, label: item.name }))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!session?.user.id) return setError("Your session could not be verified. Sign in again and retry.")
    if (!directory.watersheds.some((item) => item.id === watershedId)) return setError("Select a watershed in your permitted data scope.")
    if (!directory.types.some((item) => item.id === typeId)) return setError("Select an active intervention type.")
    const lat = Number(latitude)
    const lon = Number(longitude)
    if (!latitude.trim() || !Number.isFinite(lat) || lat < -90 || lat > 90) return setError("Enter a latitude between -90 and 90 degrees.")
    if (!longitude.trim() || !Number.isFinite(lon) || lon < -180 || lon > 180) return setError("Enter a longitude between -180 and 180 degrees.")
    setSaving(true)
    try {
      const createdId = await createIntervention({ watershedId, typeId, name, latitude: lat, longitude: lon, implementationDate, status, description, implementingAgency: agency, userId: session.user.id })
      onCreated(createdId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Intervention could not be saved.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      {error && <ErrorState description={error} title="Unable to save intervention" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Intervention name" onChange={(event) => setName(event.target.value)} required value={name} />
        <Select label="Intervention type" onChange={(event) => setTypeId(event.target.value)} options={typeOptions} placeholder="Select type" required value={typeId} />
        <Select label="Watershed" onChange={(event) => setWatershedId(event.target.value)} options={watershedOptions} placeholder="Select watershed" required value={watershedId} />
        <Input hint="Stored in WGS84 / EPSG:4326." label="Latitude" max="90" min="-90" onChange={(event) => setLatitude(event.target.value)} required step="any" type="number" value={latitude} />
        <Input label="Longitude" max="180" min="-180" onChange={(event) => setLongitude(event.target.value)} required step="any" type="number" value={longitude} />
        <Input label="Implementation date" onChange={(event) => setImplementationDate(event.target.value)} required type="date" value={implementationDate} />
        <Select label="Status" onChange={(event) => setStatus(event.target.value as InterventionStatus)} options={statusValues.map((item) => ({ value: item, label: statusLabels[item] }))} value={status} />
        <Input label="Implementing agency" onChange={(event) => setAgency(event.target.value)} value={agency} />
      </div>
      <label className="block text-sm font-medium text-ink" htmlFor="intervention-description">Description</label>
      <textarea className="min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20" id="intervention-description" onChange={(event) => setDescription(event.target.value)} value={description} />
      <Card className="bg-canvas p-3 shadow-none">
        <p className="text-xs font-semibold text-ink">Evidence associations</p>
        <p className="mt-1 text-xs leading-5 text-muted">Linked field photos appear after their intervention link is recorded. Satellite observations and indicators are associated by watershed and observation date. Attachments are not uploaded from this form.</p>
      </Card>
      <div className="flex justify-end gap-2"><Button onClick={onClose} variant="secondary">Cancel</Button><Button disabled={saving} leadingIcon={FilePlus2} type="submit">{saving ? "Saving…" : "Save intervention"}</Button></div>
    </form>
  )
}

function EvidenceGallery({ record }: { record: InterventionRecord }) {
  const before = record.evidence.filter((item) => item.stage === "BEFORE")
  const after = record.evidence.filter((item) => item.stage === "AFTER")
  const other = record.evidence.filter((item) => item.stage === null)
  const groups = [{ title: "Before", rows: before }, { title: "After", rows: after }, { title: "Field photos · stage not recorded", rows: other }]
  return <div className="mt-4 space-y-4">
    {groups.map(({ title, rows }) => <section key={title}>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {rows.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{rows.map((photo) => <figure className="overflow-hidden rounded-lg border border-line" key={photo.id}>
        {photo.signedUrl ? <img alt={`Intervention field evidence: ${photo.fileName}`} className="h-36 w-full bg-canvas object-cover" loading="lazy" src={photo.signedUrl} /> : <div className="grid h-36 place-items-center bg-canvas text-muted"><Camera aria-hidden="true" className="size-7" /></div>}
        <figcaption className="p-2"><p className="truncate text-xs font-medium text-ink">{photo.fileName}</p><p className="mt-1 text-[11px] text-muted">{formatDate(photo.capturedAt)} · {photo.verificationStatus}</p></figcaption>
      </figure>)}</div> : <p className="rounded-lg border border-dashed border-line px-3 py-3 text-xs text-muted">No {title.toLowerCase()} evidence is linked to this intervention.</p>}
    </section>)}
  </div>
}

function InterventionDetail({ directory, record }: { directory: InterventionDirectory; record: InterventionRecord }) {
  const navigate = useNavigate()
  const point = pointFor(record)
  const locationFeatures: MapFeatureCollection = { type: "FeatureCollection", features: directory.mapFeatures.features.filter((feature) => String(feature.properties?.intervention_id ?? feature.id ?? "") === record.id) }
  const neighbors = directory.records.flatMap((candidate) => {
    if (candidate.id === record.id || candidate.watershedId !== record.watershedId || !point) return []
    const other = pointFor(candidate)
    if (!other) return []
    const km = distanceKm(point, other)
    return km <= 10 ? [{ candidate, km }] : []
  }).sort((a, b) => a.km - b.km).slice(0, 8)
  const fitBounds: [[number, number], [number, number]] | undefined = point ? [[point[0] - 0.015, point[1] - 0.015], [point[0] + 0.015, point[1] + 0.015]] : undefined
  const timeline = [
    { label: "Record created", date: record.createdAt },
    { label: "Planned / entered implementation date", date: record.plannedStart },
    { label: "Actual start", date: record.actualStart },
    { label: "Actual completion", date: record.actualEnd },
    { label: `Current status · ${statusLabels[record.status]}`, date: record.updatedAt },
  ].filter((item) => item.date)

  return <div className="page-section">
    <PageHeader actions={<StatusBadge labels={{ active: "In progress", pending: statusLabels[record.status], completed: "Completed", inactive: "Cancelled" }} status={statusKind(record.status)} />} breadcrumbs={<Breadcrumbs items={[{ label: "Analysis" }, { label: "Interventions", href: "/analysis/interventions" }, { label: "Detail" }]} />} description="Intervention record, spatial context, and associated evidence." eyebrow="Watershed interventions" title={record.name} />
    <div className="flex flex-wrap gap-2"><Button leadingIcon={ArrowLeft} onClick={() => navigate("/analysis/interventions")} variant="secondary">Back to interventions</Button><Badge variant="info">{record.type}</Badge><Badge variant="neutral">ID {record.code ?? record.id}</Badge></div>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
      <Card><SectionHeader description="Stored intervention geometry in WGS84." title="Map location" />{point ? <div className="mt-4"><MapView className="h-80 min-h-80" data={locationFeatures} fitBounds={fitBounds} initialView={{ center: point, zoom: 12 }} /></div> : <EmptyState className="min-h-32" description="No point location is available for this intervention." icon={MapPin} title="Location unavailable" />}{point && <p className="mt-2 text-xs text-muted">{point[1].toFixed(6)}, {point[0].toFixed(6)}</p>}</Card>
      <Card><SectionHeader description="Stored record attributes and implementation status." title="Intervention details" /><dl className="mt-4 divide-y divide-line">{[
        ["Intervention ID", record.code ?? record.id], ["Type", record.type], ["Watershed", `${record.watershedCode} · ${record.watershedName}`], ["Implementation date", formatDate(record.actualStart ?? record.plannedStart)], ["Implementing agency", record.implementingAgency || "Not recorded"], ["Description", record.description || "Not provided"], ["Last updated", formatDate(record.updatedAt)],
      ].map(([label, value]) => <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-2.5 first:pt-0" key={label}><dt className="text-xs text-muted">{label}</dt><dd className="break-words text-right text-xs font-medium text-ink">{value}</dd></div>)}</dl></Card>
    </div>
    <Card><SectionHeader description="Photo groups use stage metadata when it has been supplied; unclassified photos remain separate." title="Field photos and before/after evidence" /><EvidenceGallery record={record} /></Card>
    <ProvenancePanel dataSource="Intervention register" sourceType="Intervention record" dataset="public.interventions" createdBy={record.createdBy} lastUpdated={record.updatedAt} sourceReference={record.code ?? record.id} />
    <div className="grid items-start gap-4 xl:grid-cols-2">
      <Card><SectionHeader description="Watershed observations with their recorded dates. Associated data does not establish intervention causation." title="Satellite indicators · observed change" />{record.observations.length ? <div className="mt-4 space-y-2">{record.observations.slice(0, 10).map((item) => <div className="rounded-lg border border-line p-3" key={`${item.source}-${item.id}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-ink">{item.label}</p><Badge variant="neutral">{item.source}</Badge></div>{item.value !== null && <p className="mt-1 text-sm text-ink">{item.value.toLocaleString()} {item.unit ?? ""}</p>}{item.summary && <p className="mt-1 text-sm text-muted">{item.summary}</p>}<p className="mt-1 text-xs text-muted">Observed {formatDate(item.observedAt)}</p></div>)}</div> : <EmptyState className="min-h-32" description="No satellite observations or indicators are available for this watershed in your access scope." icon={Satellite} title="No satellite evidence" />}</Card>
      <Card><SectionHeader description="Intervention and evidence locations within the same watershed." title="Nearby features" />{neighbors.length ? <ul className="mt-4 divide-y divide-line">{neighbors.map(({ candidate, km }) => <li className="flex items-center justify-between gap-3 py-3 first:pt-0" key={candidate.id}><div className="min-w-0"><Link className="truncate text-sm font-semibold text-brand-800 hover:underline" to={`/analysis/interventions/${candidate.id}`}>{candidate.name}</Link><p className="mt-1 text-xs text-muted">{candidate.type} · {statusLabels[candidate.status]}</p></div><Badge variant="neutral">{km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}</Badge></li>)}</ul> : <EmptyState className="min-h-32" description="No other intervention points within 10 km were found in this watershed." icon={MapPin} title="No nearby points" />}</Card>
    </div>
    <Card><SectionHeader description="Dates available in the intervention record." title="Timeline" /><ol className="mt-4 space-y-3">{timeline.map((event, index) => <li className="flex gap-3" key={`${event.label}-${event.date}`}><span aria-hidden="true" className={`mt-1 size-2.5 shrink-0 rounded-full ${index === timeline.length - 1 ? "bg-brand-700" : "bg-environment-600"}`} /><div><p className="text-sm font-medium text-ink">{event.label}</p><p className="mt-0.5 text-xs text-muted">{formatDate(event.date)}</p></div></li>)}</ol></Card>
    <p className="text-xs leading-5 text-muted">Spatial/temporal evidence and associated watershed indicators describe observations only. They do not establish that this intervention caused an environmental change.</p>
  </div>
}

function InterventionCard({ record }: { record: InterventionRecord }) {
  return <Card as="article" className="p-4">
    <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{record.code ?? record.id}</p><h2 className="mt-1 truncate text-base font-semibold text-ink">{record.name}</h2><p className="mt-1 text-xs text-muted">{record.type} · {record.watershedCode} · {record.watershedName}</p></div><StatusBadge labels={{ active: "In progress", pending: statusLabels[record.status], completed: "Completed", inactive: "Cancelled" }} status={statusKind(record.status)} /></div>
    <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted">{record.description || "No description recorded."}</p>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted"><span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="size-3.5" />{formatDate(record.actualStart ?? record.plannedStart)}</span><span className="inline-flex items-center gap-1"><Camera aria-hidden="true" className="size-3.5" />{record.evidence.length} field photos</span><span className="inline-flex items-center gap-1"><Activity aria-hidden="true" className="size-3.5" />{record.observations.length} associated observations</span></div>
    <div className="mt-3 flex justify-end"><Link className="rounded-md px-2 py-1 text-sm font-semibold text-brand-800 hover:bg-blue-50" to={`/analysis/interventions/${record.id}`}>View details</Link></div>
  </Card>
}

function InterventionsModule() {
  const { interventionId } = useParams()
  const [searchParams] = useSearchParams()
  const routeDates = readRouteDateRange(searchParams)
  const { configurationError } = useAuth()
  const navigate = useNavigate()
  const [directory, setDirectory] = useState<InterventionDirectory | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [watershedFilter, setWatershedFilter] = useState(() => searchParams.get("watershed") ?? "")
  const [typeFilter, setTypeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dateRange, setDateRange] = useState<DateRange>(routeDates)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try { setDirectory(await loadInterventionDirectory()) }
    catch (error) { setLoadError(error instanceof Error ? error.message : "Intervention records could not be loaded.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let active = true
    loadInterventionDirectory().then((value) => { if (active) setDirectory(value) }).catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Intervention records could not be loaded.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const records = directory?.records ?? noInterventions
  const visibleRecords = useMemo(() => records.filter((record) => (!watershedFilter || record.watershedId === watershedFilter) && (!typeFilter || record.type === typeFilter) && (!statusFilter || record.status === statusFilter) && isWithinRouteDateRange(record.actualStart ?? record.plannedStart, dateRange)), [dateRange, records, statusFilter, typeFilter, watershedFilter])
  const selected = interventionId ? records.find((record) => record.id === interventionId) : undefined
  const visibleIds = useMemo(() => new Set(visibleRecords.map((record) => record.id)), [visibleRecords])
  const mapFeatures: MapFeatureCollection = useMemo(() => ({ type: "FeatureCollection", features: directory?.mapFeatures.features.filter((feature) => visibleIds.has(String(feature.properties?.intervention_id ?? feature.id ?? ""))) ?? [] }), [directory?.mapFeatures.features, visibleIds])
  const mapBounds = useMemo(() => {
    const coordinates = mapFeatures.features.flatMap((feature) => feature.geometry?.type === "Point" ? [feature.geometry.coordinates] : [])
    if (!coordinates.length) return undefined
    const lons = coordinates.map(([lon]) => lon); const lats = coordinates.map(([, lat]) => lat)
    const pad = coordinates.length === 1 ? 0.015 : 0.005
    return [[Math.min(...lons) - pad, Math.min(...lats) - pad], [Math.max(...lons) + pad, Math.max(...lats) + pad]] as [[number, number], [number, number]]
  }, [mapFeatures])

  if (configurationError) return <div className="page-section"><PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "Analysis" }, { label: "Interventions" }]} />} eyebrow="Watershed interventions" title="Interventions" /><ErrorState description="Supabase is not configured. Add the shared project URL and publishable key to local .env before loading records." title="Supabase setup required" /></div>
  if (loading) return <div className="page-section"><PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "Analysis" }, { label: "Interventions" }]} />} eyebrow="Watershed interventions" title="Interventions" /><Card><LoadingState label="Loading interventions" rows={5} /></Card></div>
  if (loadError) return <div className="page-section"><PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "Analysis" }, { label: "Interventions" }]} />} eyebrow="Watershed interventions" title="Interventions" /><ErrorState description={loadError} onRetry={() => void load()} /></div>
  if (interventionId) return selected ? <InterventionDetail directory={directory!} record={selected} /> : <div className="page-section"><PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "Analysis" }, { label: "Interventions", href: "/analysis/interventions" }, { label: "Detail" }]} />} eyebrow="Watershed interventions" title="Intervention detail" /><ErrorState description="This intervention is unavailable or outside your permitted watershed scope." onRetry={() => void load()} title="Intervention not found" /></div>

  const watershedOptions = (directory?.watersheds ?? []).map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))
  const typeOptions = interventionTypes.map((item) => ({ value: item, label: item }))
  const statusOptions = statusValues.map((item) => ({ value: item, label: statusLabels[item] }))
  return <div className="page-section">
    <PageHeader actions={<Button disabled={!directory?.watersheds.length || !directory.types.length} leadingIcon={Plus} onClick={() => setFormOpen(true)}>Add intervention</Button>} breadcrumbs={<Breadcrumbs items={[{ label: "Analysis" }, { label: "Interventions" }]} />} description="Register watershed interventions and review their spatial and temporal evidence." eyebrow="Watershed monitoring" title="Interventions" />
    <div className="grid gap-3 sm:grid-cols-3">
      {[{ label: "Total records", value: records.length }, { label: "In progress", value: records.filter((item) => item.status === "IN_PROGRESS").length }, { label: "Completed", value: records.filter((item) => item.status === "COMPLETED").length }].map((item) => <Card className="p-4" key={item.label}><p className="text-xs font-medium text-muted">{item.label}</p><p className="mt-1 text-2xl font-bold text-ink">{item.value}</p></Card>)}
    </div>
    {!directory?.watersheds.length && <Card className="bg-amber-50"><p className="text-sm font-semibold text-amber-900">No watershed records available</p><p className="mt-1 text-sm text-amber-800">Interventions require a watershed record and the current account’s access scope.</p></Card>}
    <Card className="p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.2fr_auto]"><Select label="Watershed" onChange={(event) => setWatershedFilter(event.target.value)} options={watershedOptions} placeholder="All watersheds" value={watershedFilter} /><Select label="Intervention type" onChange={(event) => setTypeFilter(event.target.value)} options={typeOptions} placeholder="All types" value={typeFilter} /><Select label="Status" onChange={(event) => setStatusFilter(event.target.value)} options={statusOptions} placeholder="All statuses" value={statusFilter} /><DateRangePicker label="Date range" onChange={setDateRange} value={dateRange} /><Button className="self-end" leadingIcon={RefreshCw} onClick={() => { setWatershedFilter(""); setTypeFilter(""); setStatusFilter(""); setDateRange({ start: "", end: "" }) }} variant="secondary">Reset</Button></div></Card>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
      <section aria-label="Intervention list" className="min-w-0 space-y-3"><SectionHeader description={`${visibleRecords.length} of ${records.length} records`} title="Intervention list" />{visibleRecords.length ? visibleRecords.map((record) => <InterventionCard key={record.id} record={record} />) : <Card><EmptyState action={<Button disabled={!directory?.watersheds.length || !directory.types.length} leadingIcon={Plus} onClick={() => setFormOpen(true)}>Add intervention</Button>} description={records.length ? "Adjust filters or register an intervention." : "No intervention records are available in your permitted watershed scope."} icon={ClipboardList} title={records.length ? "No matching interventions" : "No interventions yet"} /></Card>}</section>
      <Card className="min-w-0"><SectionHeader description="Registered intervention locations in the current filter scope." title="Intervention map" />{mapFeatures.features.length ? <div className="mt-4"><MapView className="h-[min(56vh,40rem)] min-h-96" data={mapFeatures} fitBounds={mapBounds} initialView={{ center: [78.96, 20.59], zoom: 4 }} /></div> : <EmptyState className="min-h-64" description="Map features appear when intervention locations are available." icon={MapPin} title="No mapped interventions" />}</Card>
    </div>
    <Card className="border-blue-200 bg-blue-50/50"><div className="flex gap-3"><Workflow aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-800" /><p className="text-xs leading-5 text-muted">Satellite observations, indicators, and change records are presented as associated watershed evidence. Observed change does not establish that an intervention caused that change.</p></div></Card>
    <Modal className="max-w-3xl" onClose={() => setFormOpen(false)} open={formOpen} title="Add intervention">{directory && <InterventionForm directory={directory} initialWatershedId={watershedFilter} onClose={() => setFormOpen(false)} onCreated={(id) => { setFormOpen(false); void load().then(() => navigate(`/analysis/interventions/${id}`)) }} />}</Modal>
  </div>
}

export default InterventionsModule
