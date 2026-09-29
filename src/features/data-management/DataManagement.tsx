import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, FileUp, RefreshCw, ShieldCheck, XCircle } from "lucide-react"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { DataTable, type DataTableColumn } from "../../components/ui/DataTable"
import { Badge, Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, SectionHeader, Tabs } from "../../components/ui"
import { useAuth } from "../../hooks/useAuth"
import { loadDataManagementWorkspace, type DataManagementWorkspace, type ManagedRecord } from "../../services/dataManagementService"

type Tab = "ingestion" | "datasets" | "jobs" | "catalog" | "quality"
type ReviewState = "Valid" | "Warning" | "Invalid" | "Processing"
interface FileReview { id: string; file: File; format: string; status: ReviewState; checks: string[]; digest?: string }

const tabs = [
  { value: "ingestion", label: "Data Ingestion" }, { value: "datasets", label: "Datasets" },
  { value: "jobs", label: "Processing Jobs" }, { value: "catalog", label: "Data Catalog" }, { value: "quality", label: "Data Quality" },
] as const
const supportedExtensions: Record<string, string> = { geojson: "GeoJSON", json: "GeoJSON", csv: "CSV", tif: "GeoTIFF", tiff: "GeoTIFF", jpg: "Image", jpeg: "Image", png: "Image", webp: "Image", pdf: "Document", doc: "Document", docx: "Document", txt: "Document" }
const MAX_REVIEW_BYTES = 500 * 1024 * 1024
const noRows: ManagedRecord[] = []

function classifyFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
  return supportedExtensions[extension] ?? null
}

function badgeVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "Valid" || status === "READY" || status === "VERIFIED" || status === "AVAILABLE" || status === "ACTIVE") return "success"
  if (status === "Warning" || status === "PENDING" || status === "REGISTERED" || status === "PROCESSING") return "warning"
  if (status === "Invalid" || status === "FAILED" || status === "REJECTED") return "danger"
  return "neutral"
}

function coordinatePairs(value: unknown, output: Array<[number, number]> = []): Array<[number, number]> {
  if (!Array.isArray(value)) return output
  if (typeof value[0] === "number" && typeof value[1] === "number") output.push([value[0], value[1]])
  else value.forEach((entry) => coordinatePairs(entry, output))
  return output
}

function csvCoordinates(text: string): { pairs: Array<[number, number]>; problem: string | null } {
  const rows = text.split(/\r?\n/).filter((row) => row.trim())
  if (!rows.length) return { pairs: [], problem: "CSV file is empty." }
  const headers = rows[0].split(",").map((value) => value.trim().replace(/^"|"$/g, "").toLowerCase())
  const latIndex = headers.findIndex((name) => ["lat", "latitude", "y"].includes(name))
  const lonIndex = headers.findIndex((name) => ["lon", "lng", "longitude", "x"].includes(name))
  if (latIndex < 0 || lonIndex < 0) return { pairs: [], problem: "Coordinate columns were not identified; expected latitude/longitude or x/y headers." }
  const pairs: Array<[number, number]> = []
  for (const row of rows.slice(1)) {
    const columns = row.split(",")
    const lat = Number(columns[latIndex]?.replace(/^"|"$/g, ""))
    const lon = Number(columns[lonIndex]?.replace(/^"|"$/g, ""))
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return { pairs, problem: "At least one CSV coordinate is missing or outside WGS84 longitude/latitude bounds." }
    pairs.push([lon, lat])
  }
  return { pairs, problem: pairs.length ? null : "CSV contains headers but no data rows." }
}

async function reviewFile(file: File, knownPhotoNames: Set<string>, knownPhotoHashes: Set<string>): Promise<FileReview> {
  const format = classifyFile(file)
  const checks: string[] = []
  let status: ReviewState = "Valid"
  if (!file.name.trim() || file.size <= 0) { status = "Invalid"; checks.push("File name and non-empty file content are required.") }
  if (!format) { status = "Invalid"; checks.push("Unsupported file extension. Supported: GeoJSON, CSV, GeoTIFF, images, and common documents.") }
  if (format && file.type && file.type !== "application/octet-stream") {
    const typeMatches = format === "GeoJSON" ? ["application/geo+json", "application/json"].includes(file.type) : format === "CSV" ? ["text/csv", "application/vnd.ms-excel"].includes(file.type) : format === "GeoTIFF" ? ["image/tiff", "application/geotiff"].includes(file.type) : format === "Image" ? file.type.startsWith("image/") : format === "Document" ? ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type) : false
    if (!typeMatches) { status = "Warning"; checks.push(`Browser MIME type (${file.type}) does not match the file extension; confirm file content.`) }
  }
  if (file.size > MAX_REVIEW_BYTES) { status = "Invalid"; checks.push("File exceeds the 500 MiB browser review limit.") }
  if (format === "Image" && knownPhotoNames.has(file.name.toLowerCase())) { status = "Warning"; checks.push("A photo with this filename already exists; confirm whether this is a duplicate.") }
  if (format === "GeoJSON" && file.size <= 10 * 1024 * 1024) {
    try {
      const geojson: unknown = JSON.parse(await file.text())
      const object = typeof geojson === "object" && geojson !== null ? geojson as Record<string, unknown> : {}
      const features = object.type === "FeatureCollection" && Array.isArray(object.features) ? object.features : object.type === "Feature" ? [object] : []
      if (!features.length) { status = "Invalid"; checks.push("Expected a GeoJSON Feature or FeatureCollection with features.") }
      const points = coordinatePairs(features.map((feature) => typeof feature === "object" && feature !== null ? (feature as Record<string, unknown>).geometry : null))
      if (!points.length) { status = "Warning"; checks.push("No coordinate pairs were found; coordinate validation is incomplete.") }
      if (points.some(([lon, lat]) => lon < -180 || lon > 180 || lat < -90 || lat > 90)) { status = "Invalid"; checks.push("Coordinates exceed WGS84 longitude/latitude bounds.") }
      if (status === "Valid") checks.push(`GeoJSON parsed; ${features.length} feature(s), ${points.length} coordinate pair(s). Geometry topology still requires PostGIS validation.`)
    } catch { status = "Invalid"; checks.push("GeoJSON could not be parsed.") }
  } else if (format === "CSV" && file.size <= 10 * 1024 * 1024) {
    const result = csvCoordinates(await file.text())
    if (result.problem) { status = result.problem.includes("outside") || result.problem.includes("empty") ? "Invalid" : "Warning"; checks.push(result.problem) }
    else checks.push(`${result.pairs.length} coordinate row(s) passed WGS84 bounds checks.`)
  } else if (format === "GeoTIFF") {
    checks.push("GeoTIFF structure, CRS, raster dimensions, and NoData values require server-side GDAL/Rasterio validation.")
    if (status === "Valid") status = "Warning"
  } else if (format === "Image") checks.push("Image metadata and duplicate content hash require deeper review; filename matching is advisory only.")
  else if (format === "Document") checks.push("Document type and size checked locally; content and metadata are not inspected.")
  if (file.size > 10 * 1024 * 1024 && (format === "GeoJSON" || format === "CSV")) { status = "Warning"; checks.push("Large file was not parsed in the browser; coordinate checks remain pending.") }
  let digest: string | undefined
  if (format === "Image" && file.size <= 10 * 1024 * 1024 && crypto.subtle) {
    try { const bytes = await file.arrayBuffer(); digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((part) => part.toString(16).padStart(2, "0")).join(""); if (knownPhotoHashes.has(digest)) { status = "Invalid"; checks.push("Duplicate image content matches an existing geo-photo SHA-256 checksum.") } }
    catch { checks.push("Content hash unavailable in this browser.") }
  }
  return { id: `${file.name}-${file.size}-${file.lastModified}`, file, format: format ?? "Unknown", status, checks, digest }
}

function datasetRows(workspace: DataManagementWorkspace): ManagedRecord[] {
  const groups = [
    { name: "Registered data sources", type: "Catalog entries", rows: workspace.sources },
    { name: "Satellite scenes", type: "Raster / GeoTIFF references", rows: workspace.scenes },
    { name: "Satellite observations", type: "Analysis inputs", rows: workspace.observations },
    { name: "Geo-tagged photos", type: "Images", rows: workspace.photos },
  ]
  return groups.map((group) => ({ id: group.name, name: group.name, type: group.type, status: "Available", date: null, source: `${group.rows.length} record(s)`, reference: group.rows[0]?.reference ?? "No record reference", details: "Live records from the authorized Supabase workspace" }))
}

function RecordsTable({ rows, label }: { rows: ManagedRecord[]; label: string }) {
  const columns: DataTableColumn<ManagedRecord>[] = [
    { key: "name", header: "Name", render: (row) => <div className="min-w-44"><p className="font-semibold text-ink">{row.name}</p><p className="mt-1 text-xs text-muted">{row.details}</p></div> },
    { key: "type", header: "Type", render: (row) => row.type },
    { key: "status", header: "Status", render: (row) => <Badge variant={badgeVariant(row.status)}>{row.status}</Badge> },
    { key: "source", header: "Source / count", render: (row) => row.source },
    { key: "date", header: "Date", render: (row) => row.date ? new Date(row.date).toLocaleDateString() : "Not recorded" },
    { key: "reference", header: "Reference", render: (row) => <span className="block max-w-64 break-all text-xs text-muted">{row.reference}</span> },
  ]
  return <DataTable caption={label} columns={columns} getRowKey={(row) => row.id} rows={rows} emptyTitle={`No ${label.toLowerCase()} available`} emptyDescription="No matching records are available in the permitted data scope." />
}

export default function DataManagement() {
  const { configurationError } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("ingestion")
  const [workspace, setWorkspace] = useState<DataManagementWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [reviews, setReviews] = useState<FileReview[]>([])
  const [datasetName, setDatasetName] = useState("")
  const [sourceReference, setSourceReference] = useState("")
  const [reviewing, setReviewing] = useState(false)

  async function load() {
    setLoading(true); setError(null)
    try { setWorkspace(await loadDataManagementWorkspace()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load the data catalog.") }
    finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    loadDataManagementWorkspace().then((value) => { if (active) setWorkspace(value) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load the data catalog.") })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const photos = workspace?.photos ?? noRows
  const sceneRows = workspace?.scenes ?? noRows
  const jobRows = [...sceneRows, ...(workspace?.observations ?? [])].filter((row) => ["PROCESSING", "FAILED", "REGISTERED"].includes(row.status))
  const qualityRows = useMemo(() => [
    ...photos.filter((row) => row.source === "INVALID" || row.source === "MISSING").map((row) => ({ ...row, status: "Invalid", details: `Location/GPS validation: ${row.source}; ${row.details}` })),
    ...photos.filter((row) => row.status === "PENDING").map((row) => ({ ...row, status: "Warning", details: "Evidence review is pending." })),
    ...sceneRows.filter((row) => row.status === "FAILED").map((row) => ({ ...row, status: "Invalid", details: "Scene is marked failed in its stored record." })),
  ], [photos, sceneRows])
  const knownPhotoNames = useMemo(() => new Set(photos.map((photo) => photo.name.toLowerCase())), [photos])

  async function runPreflight() {
    setReviewing(true)
    try {
      const knownPhotoHashes = new Set(photos.map((photo) => photo.checksum).filter((value): value is string => Boolean(value)))
      const result = await Promise.all(files.map((file) => reviewFile(file, knownPhotoNames, knownPhotoHashes)))
      const hashes = new Set<string>()
      for (const item of result) if (item.digest) {
        if (hashes.has(item.digest)) { item.status = "Invalid"; item.checks.push("Duplicate image content detected among selected files.") }
        hashes.add(item.digest)
      }
      setReviews(result)
    } finally { setReviewing(false) }
  }

  const header = <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "System" }, { label: "Data Management" }]} />} description="Review registered datasets, source records, processing states, and pre-ingestion quality checks." eyebrow="System administration" title="Data Management" />
  if (configurationError) return <div className="page-section">{header}<ErrorState description="Supabase is not configured. Configure local project environment variables to load the live catalog." title="Supabase setup required" /></div>
  if (loading) return <div className="page-section">{header}<Card><LoadingState label="Loading datasets and data sources" rows={5} /></Card></div>
  if (error || !workspace) return <div className="page-section">{header}<ErrorState description={error ?? "The data catalog could not be loaded."} onRetry={() => void load()} title="Data management unavailable" /></div>

  const datasets = datasetRows(workspace)
  return <div className="page-section">
    {header}
    <Card className="p-0"><Tabs label="Data management sections" onChange={(value) => setActiveTab(value as Tab)} tabs={tabs} value={activeTab} />
      <div className="p-4 sm:p-5">
        {activeTab === "ingestion" && <div className="space-y-4"><SectionHeader description="Select files for a local preflight review. Nothing is uploaded or accepted by this screen." title="Ingestion preflight" />
          <div className="grid gap-3 sm:grid-cols-2"><Input label="Dataset name" onChange={(event) => setDatasetName(event.target.value)} required value={datasetName} /><Input label="Source reference" onChange={(event) => setSourceReference(event.target.value)} required value={sourceReference} /></div>
          <label className="block rounded-xl border-2 border-dashed border-slate-300 bg-canvas p-6 text-center hover:border-brand-600"><FileUp aria-hidden="true" className="mx-auto size-7 text-brand-700" /><span className="mt-2 block text-sm font-semibold text-ink">Choose GeoJSON, CSV, GeoTIFF, images, or documents</span><span className="mt-1 block text-xs text-muted">Up to 500 MiB per file for local review</span><input accept=".geojson,.json,.csv,.tif,.tiff,.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt" className="sr-only" multiple onChange={(event) => { setFiles(Array.from(event.target.files ?? [])); setReviews([]) }} type="file" /></label>
          {files.length > 0 && <p className="text-xs text-muted">{files.length} file(s) selected: {files.map((file) => file.name).join(", ")}</p>}
          <div className="flex flex-wrap gap-2"><Button disabled={!files.length || !datasetName.trim() || !sourceReference.trim() || reviewing} leadingIcon={ShieldCheck} onClick={() => void runPreflight()}>{reviewing ? "Checking files…" : "Run validation"}</Button><Button onClick={() => { setFiles([]); setReviews([]); setDatasetName(""); setSourceReference("") }} variant="secondary">Clear selection</Button></div>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Preflight only: these files are not uploaded, processed, or registered. Invalid items remain blocked; warning items require operator review. Full geometry topology, CRS, and raster validation require a trusted GDAL/PostGIS processing step.</p>
          {reviews.length > 0 && <div className="space-y-3">{reviews.map((item) => <Card className="p-4" key={item.id}><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-ink">{item.file.name}</p><p className="mt-1 text-xs text-muted">{datasetName} · {item.format} · {(item.file.size / (1024 * 1024)).toFixed(2)} MiB</p></div><Badge variant={badgeVariant(item.status)}>{item.status}</Badge></div><ul className="mt-3 space-y-1 text-xs text-muted">{item.checks.map((check) => <li className="flex gap-2" key={check}>{item.status === "Invalid" ? <XCircle className="size-4 shrink-0 text-red-700" /> : item.status === "Warning" ? <AlertTriangle className="size-4 shrink-0 text-amber-700" /> : <CheckCircle2 className="size-4 shrink-0 text-green-700" />}{check}</li>)}</ul>{item.digest && <p className="mt-2 break-all text-[11px] text-muted">SHA-256: {item.digest}</p>}</Card>)}</div>}
        </div>}
        {activeTab === "datasets" && <div className="space-y-4"><SectionHeader description="Counts and references are queried from the existing Supabase records." title="Dataset inventory" /><RecordsTable label="Datasets" rows={datasets} /></div>}
        {activeTab === "jobs" && <div className="space-y-4"><SectionHeader description="Processing states currently recorded on satellite scene and observation rows. No new jobs are started here." title="Processing jobs" />{jobRows.length ? <RecordsTable label="Processing records" rows={jobRows} /> : <EmptyState icon={RefreshCw} title="No queued or failed processing records" description="The current database contains no records marked Processing, Failed, or Registered." />}</div>}
        {activeTab === "catalog" && <div className="space-y-4"><SectionHeader description="Registered source records and their stored references; references are displayed as recorded." title="Data catalog" /><RecordsTable label="Data sources" rows={workspace.sources} /><div className="pt-2"><SectionHeader description="Registered scenes and their referenced assets." title="Raster and scene references" /><RecordsTable label="Satellite scenes" rows={workspace.scenes} /></div></div>}
        {activeTab === "quality" && <div className="space-y-4"><SectionHeader description="Stored record flags and local preflight findings. File contents are not considered accepted based on browser checks." title="Data quality review" /><div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-xs text-muted">Invalid / missing GPS</p><p className="mt-2 text-2xl font-bold text-ink">{photos.filter((row) => row.source === "INVALID" || row.source === "MISSING").length}</p></Card><Card className="p-4"><p className="text-xs text-muted">Pending evidence review</p><p className="mt-2 text-2xl font-bold text-ink">{photos.filter((row) => row.status === "PENDING").length}</p></Card><Card className="p-4"><p className="text-xs text-muted">Failed raster / observation records</p><p className="mt-2 text-2xl font-bold text-ink">{[...sceneRows, ...workspace.observations].filter((row) => row.status === "FAILED").length}</p></Card></div><RecordsTable label="Quality findings" rows={qualityRows} /></div>}
      </div>
    </Card>
  </div>
}
