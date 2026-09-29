import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, CalendarDays, Cloud, Database, Layers3, RefreshCw, Satellite, ScanLine } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { ProvenancePanel } from "../../components/ProvenancePanel"
import { Badge, Button, Card, DateRangePicker, EmptyState, ErrorState, LoadingState, PageHeader, SectionHeader, Select, StatusBadge, type DateRange } from "../../components/ui"
import { useAuth } from "../../hooks/useAuth"
import { isWithinRouteDateRange, readRouteDateRange } from "../../lib/routeScope"
import { classifyRemoteSensingProduct, loadRemoteSensingDirectory, remoteSensingProducts, type RemoteSensingDirectory, type SatelliteSceneRecord } from "../../services/remoteSensingService"

const emptyScenes: SatelliteSceneRecord[] = []
const sceneStatusLabels = { REGISTERED: "Registered", PROCESSING: "Processing", READY: "Ready", FAILED: "Failed", ARCHIVED: "Archived" }

function statusValue(status: string): "pending" | "active" | "completed" | "critical" | "inactive" {
  if (status === "READY") return "completed"
  if (status === "FAILED") return "critical"
  if (status === "ARCHIVED") return "inactive"
  if (status === "PROCESSING") return "active"
  return "pending"
}

function statusLabels(status: string) {
  const label = sceneStatusLabels[status as keyof typeof sceneStatusLabels] ?? status
  return { pending: label, active: label, completed: label, critical: label, inactive: label }
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: value.includes("T") ? "short" : undefined })
}

function periodLabel(scene: SatelliteSceneRecord) {
  if (scene.observationStart && scene.observationEnd) return `${formatDate(scene.observationStart)} – ${formatDate(scene.observationEnd)}`
  if (scene.observationStart) return `From ${formatDate(scene.observationStart)}`
  if (scene.observationEnd) return `Through ${formatDate(scene.observationEnd)}`
  return "Single acquisition"
}

function SceneCard({ scene }: { scene: SatelliteSceneRecord }) {
  return <Card as="article" className="p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{scene.sceneIdentifier}</p><h2 className="mt-1 truncate text-base font-semibold text-ink">{scene.platform || scene.sourceName}{scene.sensor ? ` · ${scene.sensor}` : ""}</h2><p className="mt-1 text-xs text-muted">{scene.watershedCode} · {scene.watershedName}</p></div><StatusBadge labels={statusLabels(scene.status)} status={statusValue(scene.status)} /></div>
    <div className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-2"><span className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden="true" className="size-3.5" />Acquired {formatDate(scene.acquiredAt)}</span><span className="inline-flex items-center gap-1.5"><ScanLine aria-hidden="true" className="size-3.5" />{scene.resolutionM === null ? "Resolution not recorded" : `${scene.resolutionM} m resolution`}</span><span className="inline-flex items-center gap-1.5"><Cloud aria-hidden="true" className="size-3.5" />{scene.cloudCoverage === null ? "Cloud coverage not recorded" : `${scene.cloudCoverage}% cloud coverage`}</span><span className="inline-flex items-center gap-1.5"><Layers3 aria-hidden="true" className="size-3.5" />{periodLabel(scene)}</span></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{Array.from(new Set(scene.observations.map((item) => classifyRemoteSensingProduct(item.code)).filter((item): item is NonNullable<typeof item> => item !== null))).map((product) => <Badge key={product} variant="info">{product}</Badge>)}{scene.observations.length === 0 && <Badge variant="neutral">No measurements recorded</Badge>}</div>
    <div className="mt-3 flex justify-end"><Link className="rounded-md px-2 py-1 text-sm font-semibold text-brand-800 hover:bg-blue-50" to={`/analysis/satellite-data/${scene.id}`}>View scene details</Link></div>
  </Card>
}

function Timeline({ scenes }: { scenes: SatelliteSceneRecord[] }) {
  if (!scenes.length) return <EmptyState className="min-h-28" description="Scene events will appear after satellite scene metadata is registered." icon={CalendarDays} title="No acquisitions yet" />
  return <ol aria-label="Satellite acquisition timeline" className="relative mt-4 space-y-4 border-l border-blue-200 pl-5">{scenes.map((scene) => <li className="relative" key={scene.id}><span aria-hidden="true" className="absolute -left-[1.6rem] top-1 size-3 rounded-full border-2 border-white bg-brand-700 ring-1 ring-blue-200" /><p className="text-xs font-semibold text-brand-800">{formatDate(scene.acquiredAt)}</p><Link className="mt-1 block text-sm font-semibold text-ink hover:text-brand-800" to={`/analysis/satellite-data/${scene.id}`}>{scene.sceneIdentifier}</Link><p className="mt-0.5 text-xs text-muted">{scene.platform || scene.sourceName} · {scene.watershedName}</p></li>)}</ol>
}

function SceneDetail({ directory, scene }: { directory: RemoteSensingDirectory; scene: SatelliteSceneRecord }) {
  const navigate = useNavigate()
  const observations = scene.observations
  const changes = directory.changes.filter((change) => change.watershedId === scene.watershedId)
  const supportedProducts = remoteSensingProducts.map((product) => ({ product, count: observations.filter((item) => classifyRemoteSensingProduct(item.code) === product).length }))
  const metadataRows: Array<[string, string]> = [
    ["Scene identifier", scene.sceneIdentifier],
    ["Acquisition date", formatDate(scene.acquiredAt)],
    ["Satellite / platform", scene.platform || "Not recorded"],
    ["Sensor", scene.sensor || "Not recorded"],
    ["Source", scene.sourceName],
    ["Resolution", scene.resolutionM === null ? "Not recorded" : `${scene.resolutionM} m`],
    ["Cloud coverage", scene.cloudCoverage === null ? "Not recorded" : `${scene.cloudCoverage}%`],
    ["Observation period", periodLabel(scene)],
    ["Watershed", `${scene.watershedCode} · ${scene.watershedName}`],
    ["Scene status", scene.status],
  ]
  return <div className="page-section">
    <PageHeader actions={<StatusBadge labels={statusLabels(scene.status)} status={statusValue(scene.status)} />} breadcrumbs={<Breadcrumbs items={[{ label: "Analysis" }, { label: "Satellite Data", href: "/analysis/satellite-data" }, { label: "Scene detail" }]} />} description="Scene provenance, observation metadata, and available analysis references." eyebrow="Remote sensing" title={scene.sceneIdentifier} />
    <div className="flex flex-wrap gap-2"><Button leadingIcon={ArrowLeft} onClick={() => navigate("/analysis/satellite-data")} variant="secondary">Back to satellite data</Button>{scene.platform && <Badge variant="info">{scene.platform}</Badge>}{scene.sensor && <Badge variant="neutral">{scene.sensor}</Badge>}</div>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
      <Card><SectionHeader description="Scene attributes provided by the registered data source." title="Satellite metadata" /><dl className="mt-4 divide-y divide-line">{metadataRows.map(([label, value]) => <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 py-2.5 first:pt-0" key={label}><dt className="text-xs text-muted">{label}</dt><dd className="break-words text-right text-xs font-medium text-ink">{value}</dd></div>)}</dl></Card>
    </div>
    <ProvenancePanel dataSource={scene.sourceName === "Source not linked" ? null : scene.sourceName} sourceType="Satellite scene" dataset="public.satellite_scenes" acquisitionDate={scene.acquiredAt} spatialResolution={scene.resolutionM === null ? null : `${scene.resolutionM} m`} analysisPeriod={periodLabel(scene)} sourceReference={[scene.sceneIdentifier, scene.rasterReference].filter(Boolean).join(" / ")} />
    <Card><SectionHeader description="Only recorded, available observations are shown. Empty products contain no supplied measurements." title="Analysis product interfaces" /><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{supportedProducts.map(({ product, count }) => <div className="rounded-xl border border-line bg-canvas p-4" key={product}><div className="flex items-center gap-2"><Layers3 aria-hidden="true" className="size-4 text-environment-700" /><h3 className="text-sm font-semibold text-ink">{product}</h3></div><p className="mt-2 text-xs text-muted">{count ? `${count} recorded observation${count === 1 ? "" : "s"}` : "No measurement recorded"}</p><p className="mt-2 text-[11px] text-muted">Product adapter ready for raster analysis integration.</p></div>)}</div></Card>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
      <Card><SectionHeader description="Scene observations and only those derived indicators linked through their source observation." title="Scene observations" />{observations.length ? <div className="mt-4 overflow-x-auto"><table className="min-w-full divide-y divide-line text-left text-sm"><thead className="text-xs text-muted"><tr><th className="py-2 pr-4 font-medium">Product / code</th><th className="py-2 pr-4 font-medium">Record type</th><th className="py-2 pr-4 font-medium">Value</th><th className="py-2 font-medium">Observed</th></tr></thead><tbody className="divide-y divide-line">{observations.map((item) => <tr key={`${item.recordType}-${item.id}`}><td className="py-3 pr-4"><p className="font-medium text-ink">{item.code}</p><p className="text-xs text-muted">{classifyRemoteSensingProduct(item.code) ?? "Observation"}</p></td><td className="py-3 pr-4 text-xs text-muted">{item.recordType}{item.statistic ? ` · ${item.statistic}` : ""}</td><td className="py-3 pr-4 text-xs text-ink">{item.value === null ? "—" : `${item.value.toLocaleString()} ${item.unit || ""}`}</td><td className="py-3 text-xs text-muted">{formatDate(item.observedAt)}</td></tr>)}</tbody></table></div> : <EmptyState className="min-h-32" description="No measurements are recorded for this scene. None are generated by this interface." icon={Satellite} title="No observations available" />}</Card>
      <Card><SectionHeader description="Change-analysis records for this watershed; temporal or spatial association is not causal evidence." title="Associated change detection" />{changes.length ? <div className="mt-4 space-y-2">{changes.slice(0, 8).map((change) => <div className="rounded-lg border border-line p-3" key={change.id}><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-ink">Observed change</p><Badge variant={change.status === "COMPLETED" || change.status === "REVIEWED" ? "success" : "neutral"}>{change.status}</Badge></div>{change.summary && <p className="mt-2 text-sm text-muted">{change.summary}</p>}{change.observedChange !== null && <p className="mt-1 text-sm text-ink">Recorded value: {change.observedChange}</p>}<p className="mt-1 text-xs text-muted">Recorded {formatDate(change.createdAt)}</p></div>)}</div> : <EmptyState className="min-h-32" description="No change-analysis records are available for this watershed." icon={RefreshCw} title="No change analysis yet" />}</Card>
    </div>
    <Card><SectionHeader description="Acquisitions in the same watershed, ordered newest first." title="Satellite timeline" /><Timeline scenes={directory.scenes.filter((item) => item.watershedId === scene.watershedId)} /></Card>
    <p className="text-xs leading-5 text-muted">Observed values describe the supplied raster processing outputs. Associated change detection does not establish a cause.</p>
  </div>
}

function SatelliteDataModule() {
  const { sceneId } = useParams()
  const [searchParams] = useSearchParams()
  const routeDates = readRouteDateRange(searchParams)
  const { configurationError } = useAuth()
  const [directory, setDirectory] = useState<RemoteSensingDirectory | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [watershedFilter, setWatershedFilter] = useState(() => searchParams.get("watershed") ?? "")
  const [sourceFilter, setSourceFilter] = useState("")
  const [dateRange, setDateRange] = useState<DateRange>(routeDates)
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try { setDirectory(await loadRemoteSensingDirectory()) }
    catch (error) { setLoadError(error instanceof Error ? error.message : "Satellite scene records could not be loaded.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let active = true
    loadRemoteSensingDirectory().then((value) => { if (active) setDirectory(value) }).catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Satellite scene records could not be loaded.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const scenes = directory?.scenes ?? emptyScenes
  const sourceOptions = useMemo(() => Array.from(new Map(scenes.map((scene) => [scene.sourceName, scene.sourceName])).keys()).map((name) => ({ value: name, label: name })), [scenes])
  const visibleScenes = useMemo(() => scenes.filter((scene) => (!watershedFilter || scene.watershedId === watershedFilter) && (!sourceFilter || scene.sourceName === sourceFilter) && isWithinRouteDateRange(scene.acquiredAt, dateRange)), [dateRange, scenes, sourceFilter, watershedFilter])
  const selected = sceneId ? scenes.find((scene) => scene.id === sceneId) : undefined
  const header = <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "Analysis" }, { label: "Satellite Data" }]} />} description="Review satellite acquisitions, source provenance, raster references, and recorded observations." eyebrow="Remote sensing" title="Satellite Data" />

  if (configurationError) return <div className="page-section">{header}<ErrorState description="Supabase is not configured. Add the shared project URL and publishable key to local .env before loading satellite records." title="Supabase setup required" /></div>
  if (loading) return <div className="page-section">{header}<Card><LoadingState label="Loading satellite scene metadata" rows={5} /></Card></div>
  if (loadError) return <div className="page-section">{header}<ErrorState description={loadError} onRetry={() => void load()} /></div>
  if (sceneId) return selected ? <SceneDetail directory={directory!} scene={selected} /> : <div className="page-section">{header}<ErrorState description="This scene is unavailable or outside your permitted watershed scope." title="Satellite scene not found" onRetry={() => void load()} /></div>

  const watershedOptions = (directory?.watersheds ?? []).map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))
  const timelineScenes = [...visibleScenes].sort((a, b) => b.acquiredAt.localeCompare(a.acquiredAt))
  return <div className="page-section">
    <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "Analysis" }, { label: "Satellite Data" }]} />} description="Review satellite acquisitions, source provenance, raster references, and recorded observations." eyebrow="Remote sensing" title="Satellite Data" />
    <Card className="p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_auto]"><Select label="Watershed" onChange={(event) => setWatershedFilter(event.target.value)} options={watershedOptions} placeholder="All watersheds" value={watershedFilter} /><Select label="Source" onChange={(event) => setSourceFilter(event.target.value)} options={sourceOptions} placeholder="All sources" value={sourceFilter} /><DateRangePicker label="Acquisition date range" onChange={setDateRange} value={dateRange} /><Button className="self-end" leadingIcon={RefreshCw} onClick={() => { setWatershedFilter(""); setSourceFilter(""); setDateRange({ start: "", end: "" }) }} variant="secondary">Reset filters</Button></div></Card>
    <div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-xs font-medium text-muted">Satellite scenes</p><p className="mt-1 text-2xl font-bold text-ink">{visibleScenes.length}</p></Card><Card className="p-4"><p className="text-xs font-medium text-muted">Available observations</p><p className="mt-1 text-2xl font-bold text-ink">{visibleScenes.reduce((sum, scene) => sum + scene.observations.length, 0)}</p></Card><Card className="p-4"><p className="text-xs font-medium text-muted">Watersheds represented</p><p className="mt-1 text-2xl font-bold text-ink">{new Set(visibleScenes.map((scene) => scene.watershedId)).size}</p></Card></div>
    {!scenes.length && <Card className="border-blue-200 bg-blue-50/60"><p className="flex items-center gap-2 text-sm font-semibold text-brand-900"><Database aria-hidden="true" className="size-4" />No satellite scene metadata is registered</p><p className="mt-1 text-sm leading-6 text-brand-900/80">This page shows database records only. No satellite measurements or raster datasets are generated or downloaded automatically.</p></Card>}
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.62fr)]"><section aria-label="Satellite scene list" className="min-w-0 space-y-3"><SectionHeader description={`${visibleScenes.length} scenes in the selected scope`} title="Satellite scenes" />{visibleScenes.length ? visibleScenes.map((scene) => <SceneCard key={scene.id} scene={scene} />) : <Card><EmptyState description={scenes.length ? "Change filters to view other scenes." : "Scene cards appear after authorized scene metadata is loaded into the database."} icon={Satellite} title={scenes.length ? "No matching scenes" : "No scenes available"} /></Card>}</section><Card><SectionHeader description="Chronological acquisition dates for the current filters." title="Satellite timeline" /><Timeline scenes={timelineScenes} /></Card></div>
    <Card className="border-green-200 bg-green-50/50"><div className="flex gap-3"><Layers3 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-environment-700" /><div><h2 className="text-sm font-semibold text-ink">Analysis interfaces prepared</h2><p className="mt-1 text-xs leading-5 text-muted">Scene observations can be classified as NDVI, NDWI / water index, land use / land cover, or change detection when those products are supplied. No index values are inferred from scene metadata.</p></div></div></Card>
  </div>
}

export default SatelliteDataModule
