import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { ArrowLeft, CalendarDays, Camera, FileImage, MapPin, Plus, RefreshCw, UploadCloud } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { ProvenancePanel } from "../../components/ProvenancePanel"
import { Badge, Button, Card, DateRangePicker, EmptyState, ErrorState, Input, LoadingState, Modal, PageHeader, SectionHeader, Select, StatusBadge, type DateRange, type SelectOption } from "../../components/ui"
import { MapView, type MapFeatureCollection } from "../../maps"
import { useAuth } from "../../hooks/useAuth"
import { isWithinRouteDateRange, readRouteDateRange } from "../../lib/routeScope"
import {
  ACCEPTED_EVIDENCE_MIME_TYPES,
  loadEvidenceDirectory,
  MAX_EVIDENCE_IMAGE_BYTES,
  observationTypes,
  uploadEvidence,
  type EvidenceDirectory,
  type EvidenceRecord,
  type EvidenceVerificationStatus,
  type GpsValidationStatus,
  type ObservationType,
} from "../../services/evidenceService"

const emptyFeatures: MapFeatureCollection = { type: "FeatureCollection", features: [] }
const emptyRecords: EvidenceRecord[] = []
const verificationLabels = { verified: "Verified", pending: "Pending", rejected: "Rejected" } as const
const gpsLabels = { valid: "Valid coordinates", pending: "Pending validation", inactive: "Not supplied", critical: "Invalid coordinates" } as const

function toStatus(value: EvidenceVerificationStatus) {
  return value.toLowerCase() as "verified" | "pending" | "rejected"
}

function formatDate(value: string | null) {
  if (!value) return "Not provided"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function displayGpsStatus(status: GpsValidationStatus) {
  if (status === "VALID") return { status: "verified" as const, label: gpsLabels.valid }
  if (status === "INVALID") return { status: "critical" as const, label: gpsLabels.critical }
  if (status === "MISSING") return { status: "inactive" as const, label: gpsLabels.inactive }
  return { status: "pending" as const, label: gpsLabels.pending }
}

function EvidenceCard({ record, createdByLabel }: { record: EvidenceRecord; createdByLabel: string }) {
  return (
    <Card as="article" className="p-3 sm:p-4">
      <div className="flex gap-3">
        {record.signedUrl ? (
          <img alt={`Field evidence: ${record.fileName}`} className="size-24 shrink-0 rounded-lg border border-line bg-canvas object-cover" loading="lazy" src={record.signedUrl} />
        ) : (
          <div aria-label="Image preview unavailable" className="flex size-24 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-muted"><FileImage aria-hidden="true" className="size-7" /></div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-ink">{record.fileName}</h2><p className="mt-1 text-xs text-muted">{record.observationType} · {record.watershedName}</p></div>
            <StatusBadge status={toStatus(record.verificationStatus)} labels={verificationLabels} />
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{record.description || "No description provided."}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="size-3" />{formatDate(record.capturedAt)}</span>
            <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="size-3" />{record.latitude === null || record.longitude === null ? "Coordinates unavailable" : `${record.latitude.toFixed(5)}, ${record.longitude.toFixed(5)}`}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] text-muted">Created by {createdByLabel}</span>
            <Link className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-brand-800 hover:bg-blue-50" to={`/gis/field-evidence/${record.id}`}>View details</Link>
          </div>
        </div>
      </div>
    </Card>
  )
}

interface EvidenceUploadFormProps {
  directory: EvidenceDirectory
  initialWatershedId: string
  onClose: () => void
  onUploaded: (id: string) => void
}

function EvidenceUploadForm({ directory, initialWatershedId, onClose, onUploaded }: EvidenceUploadFormProps) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [watershedId, setWatershedId] = useState(initialWatershedId)
  const [interventionId, setInterventionId] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [capturedDate, setCapturedDate] = useState("")
  const [observationType, setObservationType] = useState<ObservationType | "">("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPreviewUrl(typeof reader.result === "string" ? reader.result : null)
    reader.readAsDataURL(file)
    return () => reader.abort()
  }, [file])

  const watershedOptions: SelectOption[] = directory.watersheds.map((watershed) => ({ value: watershed.id, label: `${watershed.code} · ${watershed.name}` }))
  const interventionOptions: SelectOption[] = directory.interventions
    .filter((intervention) => intervention.watershedId === watershedId)
    .map((intervention) => ({ value: intervention.id, label: intervention.code ? `${intervention.code} · ${intervention.name}` : intervention.name }))
  const observationOptions: SelectOption[] = observationTypes.map((type) => ({ value: type, label: type }))

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null
    setError(null)
    setFile(null)
    setPreviewUrl(null)
    if (!selectedFile) return
    if (!(ACCEPTED_EVIDENCE_MIME_TYPES as readonly string[]).includes(selectedFile.type)) {
      setError("Select a JPEG, PNG, or WebP image.")
      event.target.value = ""
      return
    }
    if (selectedFile.size <= 0 || selectedFile.size > MAX_EVIDENCE_IMAGE_BYTES) {
      setError("Image must be smaller than 10 MB.")
      event.target.value = ""
      return
    }
    setFile(selectedFile)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!file) return setError("Select an image before continuing.")
    if (!session?.user.id) return setError("Your session could not be verified. Sign in again and retry.")
    if (!watershedId || !capturedDate || !observationType) return setError("Complete the required watershed, capture date, and observation type fields.")
    const parsedLatitude = Number(latitude)
    const parsedLongitude = Number(longitude)
    if (!latitude.trim() || !Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90) return setError("Enter a latitude between -90 and 90 degrees.")
    if (!longitude.trim() || !Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) return setError("Enter a longitude between -180 and 180 degrees.")

    setSubmitting(true)
    try {
      const evidenceId = await uploadEvidence(file, {
        watershedId,
        interventionId: interventionId || null,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        capturedDate,
        description,
        observationType,
      }, session.user.id)
      onUploaded(evidenceId)
      onClose()
      navigate(`/gis/field-evidence/${evidenceId}`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Evidence could not be uploaded. Please retry.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <ol aria-label="Upload steps" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {["Select image", "Preview", "Add metadata", "Validate & upload"].map((step, index) => <li className={`rounded-lg px-2 py-2 text-center text-[11px] font-semibold ${index === 0 ? "bg-brand-800 text-white" : "bg-canvas text-muted"}`} key={step}><span className="mr-1">{index + 1}.</span>{step}</li>)}
      </ol>

      <div>
        <Input accept={ACCEPTED_EVIDENCE_MIME_TYPES.join(",")} disabled={submitting} hint="JPEG, PNG, or WebP · maximum 10 MB" label="Evidence image" onChange={handleFileChange} required type="file" />
        {previewUrl && file && <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-canvas p-3"><img alt="Selected evidence preview" className="size-24 rounded-lg bg-white object-cover" src={previewUrl} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{file.name}</p><p className="mt-1 text-xs text-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB · Preview only until submitted</p></div></div>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select disabled={!file || submitting} label="Watershed" onChange={(event) => { setWatershedId(event.target.value); setInterventionId("") }} options={watershedOptions} placeholder="Select a watershed" required value={watershedId} />
        <Select disabled={!file || !watershedId || submitting} label="Intervention (optional)" onChange={(event) => setInterventionId(event.target.value)} options={interventionOptions} placeholder="No linked intervention" value={interventionId} />
        <Select disabled={!file || submitting} label="Observation type" onChange={(event) => setObservationType(event.target.value as ObservationType | "")} options={observationOptions} placeholder="Select observation type" required value={observationType} />
        <Input disabled={!file || submitting} label="Captured date" max={new Date().toISOString().slice(0, 10)} onChange={(event) => setCapturedDate(event.target.value)} required type="date" value={capturedDate} />
        <Input disabled={!file || submitting} label="Latitude" max="90" min="-90" onChange={(event) => setLatitude(event.target.value)} placeholder="e.g. 20.12345" required step="any" type="number" value={latitude} />
        <Input disabled={!file || submitting} label="Longitude" max="180" min="-180" onChange={(event) => setLongitude(event.target.value)} placeholder="e.g. 78.12345" required step="any" type="number" value={longitude} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="evidence-description">Description</label>
        <textarea className="min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/75 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:bg-slate-50" disabled={!file || submitting} id="evidence-description" maxLength={2000} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the field observation..." value={description} />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        Coordinates are checked for valid latitude and longitude ranges. GPS validation and evidence verification remain Pending until reviewed.
      </div>
      {error && <ErrorState description={error} title="Upload not completed" />}
      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button disabled={submitting} onClick={onClose} variant="secondary">Cancel</Button>
        <Button disabled={!file || submitting} leadingIcon={submitting ? undefined : UploadCloud} type="submit">{submitting ? "Uploading and saving…" : "Upload evidence"}</Button>
      </div>
    </form>
  )
}

function EvidenceDetail({ directory, evidenceId, onRetry }: { directory: EvidenceDirectory; evidenceId: string; onRetry: () => void }) {
  const { profile, session } = useAuth()
  const navigate = useNavigate()
  const record = directory.records.find((item) => item.id === evidenceId)
  const recordFeatures: MapFeatureCollection = record ? {
    type: "FeatureCollection",
    features: directory.mapFeatures.features.filter((feature) => feature.properties?.image_id === record.id),
  } : emptyFeatures

  if (!record) return <ErrorState description="This evidence record is unavailable or outside your permitted data scope." onRetry={onRetry} title="Evidence not found" />

  const gps = displayGpsStatus(record.gpsValidation)
  const createdBy = record.createdBy === session?.user.id
    ? profile?.displayName || "You"
    : record.createdBy ? `User ${record.createdBy.slice(0, 8)}` : "Unknown"

  const details: Array<[string, string]> = [
    ["Image ID", record.id],
    ["Latitude", record.latitude === null ? "Not available" : record.latitude.toFixed(6)],
    ["Longitude", record.longitude === null ? "Not available" : record.longitude.toFixed(6)],
    ["Captured date", formatDate(record.capturedAt)],
    ["Watershed", record.watershedName],
    ["Intervention", record.interventionName ?? "Not linked"],
    ["Observation type", record.observationType],
    ["Description", record.description || "No description provided."],
    ["GPS validation", gps.label],
    ["Created by", createdBy],
    ["Created at", formatDate(record.createdAt)],
  ]
  const fitBounds: [[number, number], [number, number]] | undefined = record.longitude !== null && record.latitude !== null
    ? [[record.longitude - 0.015, record.latitude - 0.015], [record.longitude + 0.015, record.latitude + 0.015]]
    : undefined

  return (
    <div className="page-section">
      <PageHeader
        actions={<StatusBadge status={toStatus(record.verificationStatus)} labels={verificationLabels} />}
        breadcrumbs={<Breadcrumbs items={[{ label: "GIS" }, { label: "Field Evidence", href: "/gis/field-evidence" }, { label: "Evidence detail" }]} />}
        description="Evidence image, geospatial metadata, and review state."
        eyebrow="Field evidence"
        title={record.fileName}
      />
      <div className="flex flex-wrap gap-2">
        <Button leadingIcon={ArrowLeft} onClick={() => navigate("/gis/field-evidence")} variant="secondary">Back to evidence</Button>
        <Badge variant={gps.status === "verified" ? "success" : gps.status === "critical" ? "danger" : "warning"}>GPS: {gps.label}</Badge>
        <Badge variant={record.verificationStatus === "VERIFIED" ? "success" : record.verificationStatus === "REJECTED" ? "danger" : "warning"}>Review: {record.verificationStatus}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <Card>
          <SectionHeader title="Image preview" description={record.fileName} />
          <div className="mt-4 grid min-h-72 place-items-center overflow-hidden rounded-xl bg-slate-950">
            {record.signedUrl ? <img alt={`Evidence image ${record.fileName}`} className="max-h-[34rem] w-full object-contain" src={record.signedUrl} /> : <EmptyState className="text-white [&_h3]:text-white [&_p]:text-slate-300" description="A signed preview URL is unavailable. Check storage access or generate a new URL." icon={FileImage} title="Preview unavailable" />}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted"><Badge variant="neutral">{record.mimeType}</Badge>{record.fileSizeBytes !== null && <Badge variant="neutral">{(record.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB</Badge>}</div>
        </Card>

        <Card>
          <SectionHeader title="Metadata" description="Stored with the evidence record in PostgreSQL." />
          <dl className="mt-4 divide-y divide-line">
            {details.map(([label, value]) => <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5 first:pt-0" key={label}><dt className="text-xs text-muted">{label}</dt><dd className="break-words text-right text-xs font-medium text-ink">{value}</dd></div>)}
          </dl>
          <div className="mt-4 border-t border-line pt-4">
            <h3 className="mb-2 text-sm font-semibold text-ink">Validation and review</h3>
            <div className="flex flex-wrap gap-2"><Badge variant={gps.status === "verified" ? "success" : gps.status === "critical" ? "danger" : "warning"}>GPS {gps.label}</Badge><StatusBadge status={toStatus(record.verificationStatus)} labels={verificationLabels} /></div>
          </div>
        </Card>
      </div>

      <ProvenancePanel dataSource="Not recorded" sourceType="Geo-tagged field photo" dataset="public.geo_photos" acquisitionDate={record.capturedAt} createdBy={createdBy} lastUpdated={record.updatedAt} sourceReference={`${record.id} / geo-photos/${record.storagePath}`} />

      <Card>
        <SectionHeader title="Evidence location" description="Map position from the stored WGS84 point." />
        {record.longitude !== null && record.latitude !== null ? <div className="mt-4"><MapView className="h-80 min-h-80" data={recordFeatures} fitBounds={fitBounds} initialView={{ center: [record.longitude, record.latitude], zoom: 12 }} /></div> : <EmptyState className="min-h-32" description="No valid point is available for this evidence item." icon={MapPin} title="Location unavailable" />}
      </Card>
    </div>
  )
}

function EvidenceModule() {
  const { evidenceId } = useParams()
  const [searchParams] = useSearchParams()
  const routeDates = readRouteDateRange(searchParams)
  const { profile, session, configurationError } = useAuth()
  const [directory, setDirectory] = useState<EvidenceDirectory | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [watershedFilter, setWatershedFilter] = useState(() => searchParams.get("watershed") ?? "")
  const [typeFilter, setTypeFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [dateRange, setDateRange] = useState<DateRange>(routeDates)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setDirectory(await loadEvidenceDirectory())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Evidence records could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    loadEvidenceDirectory().then((data) => {
      if (active) setDirectory(data)
    }).catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : "Evidence records could not be loaded.")
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const records = directory?.records ?? emptyRecords
  const filteredRecords = useMemo(() => records.filter((record) =>
    (!watershedFilter || record.watershedId === watershedFilter) &&
    (!typeFilter || record.observationType === typeFilter) &&
    (!statusFilter || record.verificationStatus === statusFilter) &&
    isWithinRouteDateRange(record.capturedAt, dateRange) &&
    (!search || `${record.fileName} ${record.description ?? ""} ${record.watershedName} ${record.observationType}`.toLowerCase().includes(search.toLowerCase())),
  ), [dateRange, records, search, statusFilter, typeFilter, watershedFilter])
  const visibleMapFeatures: MapFeatureCollection = useMemo(() => ({
    type: "FeatureCollection",
    features: directory?.mapFeatures.features.filter((feature) => {
      const properties = feature.properties ?? {}
      const id = String(properties.image_id ?? feature.id ?? "")
      return filteredRecords.some((record) => record.id === id)
    }) ?? [],
  }), [directory?.mapFeatures.features, filteredRecords])
  const mapBounds = useMemo(() => {
    const coordinates = visibleMapFeatures.features.flatMap((feature) => feature.geometry?.type === "Point" ? [feature.geometry.coordinates] : [])
    if (coordinates.length === 0) return undefined
    const longitudes = coordinates.map(([longitude]) => longitude)
    const latitudes = coordinates.map(([, latitude]) => latitude)
    const padding = coordinates.length === 1 ? 0.015 : 0.005
    return [
      [Math.min(...longitudes) - padding, Math.min(...latitudes) - padding],
      [Math.max(...longitudes) + padding, Math.max(...latitudes) + padding],
    ] as [[number, number], [number, number]]
  }, [visibleMapFeatures])

  const watershedOptions: SelectOption[] = (directory?.watersheds ?? []).map((watershed) => ({ value: watershed.id, label: `${watershed.code} · ${watershed.name}` }))
  const typeOptions: SelectOption[] = observationTypes.map((type) => ({ value: type, label: type }))
  const statusOptions: SelectOption[] = ["PENDING", "VERIFIED", "REJECTED"].map((status) => ({ value: status, label: status.charAt(0) + status.slice(1).toLowerCase() }))

  if (evidenceId && loading) {
    return <div className="page-section"><PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "GIS" }, { label: "Field Evidence", href: "/gis/field-evidence" }, { label: "Evidence detail" }]} />} eyebrow="Field evidence" title="Evidence detail" /><Card><LoadingState label="Loading evidence detail" rows={5} /></Card></div>
  }

  if (evidenceId && directory && !loading && !loadError) return <EvidenceDetail directory={directory} evidenceId={evidenceId} onRetry={() => void load()} />

  if (evidenceId && !loading && (loadError || !directory)) {
    return <div className="page-section"><PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "GIS" }, { label: "Field Evidence" }]} />} eyebrow="Field evidence" title="Evidence detail" /><ErrorState description={loadError ?? "Evidence could not be found."} onRetry={() => void load()} /></div>
  }

  const creatorLabel = (record: EvidenceRecord) => record.createdBy === session?.user.id
    ? profile?.displayName ?? "You"
    : record.createdBy ? `User ${record.createdBy.slice(0, 8)}` : "Unknown"

  return (
    <div className="page-section">
      <PageHeader
        actions={<Button disabled={!directory || Boolean(configurationError)} leadingIcon={Plus} onClick={() => setUploadOpen(true)}>Add field evidence</Button>}
        breadcrumbs={<Breadcrumbs items={[{ label: "GIS" }, { label: "Field Evidence" }]} />}
        description="Review geo-tagged field observations, locations, and verification status."
        eyebrow="GIS workspace"
        title="Field Evidence"
      />

      {configurationError && <ErrorState description="Supabase is not configured. Add the shared project URL and publishable key to local .env before loading records or uploading evidence." title="Supabase setup required" />}
      {loadError && !configurationError && <ErrorState description={loadError} onRetry={() => void load()} />}

      {!configurationError && !loadError && <>
        <Card as="section" aria-label="Evidence filters" className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(13rem,1.4fr)_minmax(13rem,1.2fr)_minmax(11rem,1fr)_minmax(10rem,0.9fr)_minmax(13rem,1.2fr)_auto] xl:items-end">
            <Input label="Search evidence" onChange={(event) => setSearch(event.target.value)} placeholder="Image, description, watershed..." type="search" value={search} />
            <Select label="Watershed" onChange={(event) => setWatershedFilter(event.target.value)} options={watershedOptions} placeholder="All watersheds" value={watershedFilter} />
            <Select label="Observation type" onChange={(event) => setTypeFilter(event.target.value)} options={typeOptions} placeholder="All types" value={typeFilter} />
            <Select label="Review status" onChange={(event) => setStatusFilter(event.target.value)} options={statusOptions} placeholder="All statuses" value={statusFilter} />
            <DateRangePicker label="Date range" onChange={setDateRange} value={dateRange} />
            <Button leadingIcon={RefreshCw} onClick={() => { setSearch(""); setWatershedFilter(""); setTypeFilter(""); setStatusFilter(""); setDateRange({ start: "", end: "" }) }} variant="secondary">Reset</Button>
          </div>
        </Card>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
          <section aria-label="Evidence list" className="min-w-0 space-y-3">
            <SectionHeader description={`${filteredRecords.length} of ${records.length} records`} title="Evidence list" />
            {loading ? <Card><LoadingState label="Loading field evidence" rows={4} /></Card> : filteredRecords.length > 0 ? filteredRecords.map((record) => <EvidenceCard createdByLabel={creatorLabel(record)} key={record.id} record={record} />) : (
              <Card><EmptyState action={<Button disabled={!directory} leadingIcon={Plus} onClick={() => setUploadOpen(true)}>Add field evidence</Button>} description={records.length ? "Change the filters or add a new observation." : "No evidence records are available in your permitted watershed scope yet."} icon={Camera} title={records.length ? "No matching evidence" : "No field evidence yet"} /></Card>
            )}
          </section>

          <Card className="min-w-0">
            <SectionHeader description="Geo-tagged photo locations in the current list." title="Evidence map" />
            {loading ? <div className="mt-4"><LoadingState label="Loading evidence map" rows={3} /></div> : <div className="mt-4"><MapView className="h-[min(56vh,40rem)] min-h-[24rem]" data={visibleMapFeatures.features.length ? visibleMapFeatures : emptyFeatures} fitBounds={mapBounds} initialView={{ center: [78.96, 20.59], zoom: 4 }} /></div>}
            <p className="mt-2 text-[11px] text-muted">Private image previews use short-lived signed URLs. Map positions are shown only where valid coordinates are available.</p>
          </Card>
        </div>
      </>}

      <Modal className="max-w-3xl" onClose={() => setUploadOpen(false)} open={uploadOpen} title="Add field evidence">
        {directory && <EvidenceUploadForm directory={directory} initialWatershedId={watershedFilter} onClose={() => setUploadOpen(false)} onUploaded={() => void load()} />}
      </Modal>
    </div>
  )
}

export default EvidenceModule
