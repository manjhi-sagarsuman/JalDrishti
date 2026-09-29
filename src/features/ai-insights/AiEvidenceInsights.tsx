import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import { AlertTriangle, BookOpen, BrainCircuit, FileCheck2, MapPinned, ShieldAlert, Sparkles } from "lucide-react"
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, SectionHeader, Select, type SelectOption } from "../../components/ui"
import { Breadcrumbs } from "../../components/Breadcrumbs"
import { ProvenancePanel } from "../../components/ProvenancePanel"
import { MapView, type MapFeatureCollection } from "../../maps"
import type { MapLayerId } from "../../maps/mapLayers"
import { useAuth } from "../../hooks/useAuth"
import { isWithinRouteDateRange, readRouteDateRange } from "../../lib/routeScope"
import { analysisTypeForIndicator, type AnalyticsComparison, type AnalyticsIndicator, type AnalyticsType } from "../../services/analyticsService"
import { loadInsightWorkspace, type InsightWorkspace } from "../../services/insightService"
import type { EvidenceRecord } from "../../services/evidenceService"
import type { AnalyticsScene } from "../../services/analyticsService"

const emptyFeatures: MapFeatureCollection = { type: "FeatureCollection", features: [] }
function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { dateStyle: "medium" })
}

function formatValue(value: number | null | undefined, unit?: string | null) {
  return value === null || value === undefined || !Number.isFinite(value) ? "Not recorded" : `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })}${unit ? ` ${unit}` : ""}`
}

function statusVariant(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "VERIFIED" || status === "VALIDATED" || status === "REVIEWED") return "success"
  if (status === "REJECTED" || status === "FAILED") return "danger"
  if (status === "PENDING" || status === "UNREVIEWED" || status === "PROCESSING") return "warning"
  return "neutral"
}

function indicatorTypeLabel(type: AnalyticsType) {
  return type === "NDVI" ? "NDVI / vegetation" : type === "NDWI / Water Index" ? "Water index" : type
}

function latestLinkedComparison(workspace: InsightWorkspace, watershedId: string, indicator: AnalyticsIndicator, sceneId: string): AnalyticsComparison | undefined {
  return workspace.analytics.comparisons
    .filter((comparison) => {
      if (comparison.watershedId !== watershedId || (comparison.status !== "COMPLETED" && comparison.status !== "REVIEWED")) return false
      const before = workspace.analytics.indicators.find((item) => item.id === comparison.baselineIndicatorId)
      const after = workspace.analytics.indicators.find((item) => item.id === comparison.comparisonIndicatorId)
      return Boolean(before && after && analysisTypeForIndicator(before.code) === analysisTypeForIndicator(indicator.code) && analysisTypeForIndicator(after.code) === analysisTypeForIndicator(indicator.code) && after.sourceSceneId === sceneId)
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

function featuresForContext(workspace: InsightWorkspace | null, evidence: EvidenceRecord | undefined, scene: AnalyticsScene | undefined, comparison: AnalyticsComparison | undefined): MapFeatureCollection {
  if (!workspace) return emptyFeatures
  const features: MapFeatureCollection["features"] = []
  if (evidence) features.push(...workspace.evidence.mapFeatures.features.filter((feature) => String(feature.properties?.image_id ?? feature.id ?? "") === evidence.id))
  if (scene) features.push(...workspace.analytics.sceneFootprints.features.filter((feature) => String(feature.properties?.scene_id ?? feature.id ?? "") === scene.id))
  if (comparison) features.push(...workspace.analytics.changeFeatures.features.filter((feature) => String(feature.properties?.change_analysis_id ?? feature.id ?? "") === comparison.id))
  return { type: "FeatureCollection", features }
}

function InsightMap({ data }: { data: MapFeatureCollection }) {
  const [visibleLayers, setVisibleLayers] = useState<MapLayerId[]>(["geo-tagged-photos", "satellite-scenes", "vegetation-change", "water-change"])
  if (!data.features.length) return <EmptyState className="min-h-56" description="Selected evidence has no mapped photo point, scene footprint, or change polygon." icon={MapPinned} title="Spatial context unavailable" />
  return <MapView className="h-[min(48vh,36rem)] min-h-72" data={data} initialView={{ center: [78.96, 20.59], zoom: 5 }} onVisibleLayersChange={setVisibleLayers} visibleLayerIds={visibleLayers} />
}

function AiEvidenceInsights() {
  const { configurationError, session } = useAuth()
  const [searchParams] = useSearchParams()
  const dateRange = readRouteDateRange(searchParams)
  const [workspace, setWorkspace] = useState<InsightWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [watershedId, setWatershedId] = useState(() => searchParams.get("watershed") ?? "")
  const [observationId, setObservationId] = useState("")
  const [indicatorId, setIndicatorId] = useState("")
  const [sceneId, setSceneId] = useState("")
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [generated, setGenerated] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadInsightWorkspace().then((value) => { if (active) setWorkspace(value) }).catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Evidence sources could not be loaded.") }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const selectedObservation = workspace?.evidence.records.find((item) => item.id === observationId)
  const selectedIndicator = workspace?.analytics.indicators.find((item) => item.id === indicatorId)
  const selectedScene = workspace?.analytics.scenes.find((item) => item.id === sceneId)
  const selectedDocuments = workspace?.documents.filter((item) => documentIds.includes(item.id)) ?? []
  const sourceById = useMemo(() => new Map((workspace?.analytics.sources ?? []).map((item) => [item.id, item])), [workspace?.analytics.sources])
  const indicatorSource = selectedIndicator?.dataSourceId ? sourceById.get(selectedIndicator.dataSourceId) : undefined
  const sceneSource = selectedScene?.sourceId ? sourceById.get(selectedScene.sourceId) : undefined
  const comparison = workspace && selectedIndicator && selectedScene
    ? latestLinkedComparison(workspace, watershedId, selectedIndicator, selectedScene.id)
    : undefined
  const baseline = comparison ? workspace?.analytics.indicators.find((item) => item.id === comparison.baselineIndicatorId) : undefined
  const after = comparison ? workspace?.analytics.indicators.find((item) => item.id === comparison.comparisonIndicatorId) : undefined
  const spatialFeatures = featuresForContext(workspace, selectedObservation, selectedScene, comparison)

  const watersheds = (workspace?.evidence.watersheds ?? []).map((item) => ({ value: item.id, label: `${item.code} / ${item.name}` }))
  const observations: SelectOption[] = (workspace?.evidence.records ?? []).filter((item) => item.watershedId === watershedId && isWithinRouteDateRange(item.capturedAt, dateRange)).map((item) => ({ value: item.id, label: `${item.observationType} / ${item.fileName} / ${formatDate(item.capturedAt)}` }))
  const indicatorOptions: SelectOption[] = (workspace?.analytics.indicators ?? []).filter((item) => item.watershedId === watershedId && isWithinRouteDateRange(item.observedAt, dateRange)).map((item) => ({ value: item.id, label: `${item.name} / ${formatValue(item.value, item.unit)} / ${formatDate(item.observedAt)}` }))
  const scenes: SelectOption[] = (workspace?.analytics.scenes ?? []).filter((item) => item.watershedId === watershedId && isWithinRouteDateRange(item.acquiredAt, dateRange)).map((item) => ({ value: item.id, label: `${item.sceneIdentifier} / ${item.platform ?? "Satellite not recorded"} / ${formatDate(item.acquiredAt)}` }))
  const documents = workspace?.documents ?? []

  function updateWatershed(value: string) {
    setWatershedId(value)
    setObservationId("")
    setIndicatorId("")
    setSceneId("")
    setGenerated(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGenerated(Boolean(watershedId && observationId && indicatorId && sceneId))
    setGeneratedAt(new Date().toISOString())
  }

  function toggleDocument(id: string) {
    setDocumentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
    setGenerated(false)
  }

  function interpretationText() {
    if (!selectedIndicator) return "Select evidence and an indicator before drafting an interpretation."
    if (!comparison || !baseline || !after) return `The selected watershed has a recorded ${selectedIndicator.name} value of ${formatValue(selectedIndicator.value, selectedIndicator.unit)} on ${formatDate(selectedIndicator.observedAt)}. No linked paired comparison is available, so a direction of change is not inferred.`
    const delta = comparison.observedChange ?? after.value - baseline.value
    const direction = delta > 0 ? "increase" : delta < 0 ? "decrease" : "no numeric difference"
    return `The selected area shows an observed ${direction} in ${selectedIndicator.name} during the linked temporal comparison (${formatDate(baseline.observedAt)} to ${formatDate(after.observedAt)}). This is a rule-based draft based on recorded values.`
  }

  const pageHeader = <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "Intelligence" }, { label: "AI Insights" }]} />} description="Review structured field, satellite, and indicator evidence with source-aware draft interpretation." eyebrow="Evidence intelligence" title="AI Evidence Insights" />
  if (configurationError) return <div className="page-section">{pageHeader}<ErrorState description="Supabase is not configured. Add the shared project URL and publishable key to local .env before loading evidence records." title="Supabase setup required" /></div>
  if (loading) return <div className="page-section">{pageHeader}<Card><LoadingState label="Loading evidence and provenance" rows={5} /></Card></div>
  if (loadError || !workspace) return <div className="page-section">{pageHeader}<ErrorState description={loadError ?? "Evidence source records are unavailable."} title="Insights unavailable" /></div>

  const indicatorKind = selectedIndicator ? analysisTypeForIndicator(selectedIndicator.code) : null
  const sourceText = [indicatorSource?.name, sceneSource?.name].filter((item, index, rows): item is string => Boolean(item) && rows.indexOf(item) === index).join(" / ") || "Not linked"
  const selectedDocumentIds = new Set(documentIds)

  return <div className="page-section">
    {pageHeader}
    <Card><div className="flex items-start gap-3"><BrainCircuit aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-800" /><div><p className="text-sm font-semibold text-ink">Structured evidence summary</p><p className="mt-1 text-xs leading-5 text-muted">This first version uses database records and deterministic templates. It does not call an AI service or train a model. Draft interpretations are not verified government findings.</p></div></div></Card>

    <Card className="p-4"><form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Select label="Selected watershed" onChange={(event) => updateWatershed(event.target.value)} options={watersheds} placeholder="Select watershed" required value={watershedId} /><Select label="Selected observation" onChange={(event) => { setObservationId(event.target.value); setGenerated(false) }} options={observations} placeholder="Select field observation" required value={observationId} /><Select label="Selected indicator" onChange={(event) => { setIndicatorId(event.target.value); setGenerated(false) }} options={indicatorOptions} placeholder="Select recorded indicator" required value={indicatorId} /><Select label="Selected satellite evidence" onChange={(event) => { setSceneId(event.target.value); setGenerated(false) }} options={scenes} placeholder="Select satellite scene" required value={sceneId} /></div>
      <fieldset><legend className="text-sm font-medium text-ink">Relevant source documents</legend><p className="mb-2 mt-1 text-xs text-muted">Select registered data-source references. Document contents are not fetched or sent to an AI service.</p>{documents.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{documents.map((document) => <label className="flex cursor-pointer gap-2 rounded-lg border border-line p-3 hover:bg-canvas" key={document.id}><input checked={selectedDocumentIds.has(document.id)} className="mt-0.5 accent-blue-800" onChange={() => toggleDocument(document.id)} type="checkbox" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{document.name}</span><span className="mt-0.5 block text-xs text-muted">{document.organization || document.code}</span></span></label>)}</div> : <p className="rounded-lg border border-dashed border-line p-3 text-xs text-muted">No active source references are registered.</p>}</fieldset>
      <div className="flex flex-wrap items-center gap-3"><Button disabled={!watershedId || !observationId || !indicatorId || !sceneId} leadingIcon={Sparkles} type="submit">Build evidence insight</Button><span className="text-xs text-muted">Interpretation is a structured draft; human review is required.</span></div>
    </form></Card>

    {!generated && <Card><EmptyState description="Choose a watershed, field observation, indicator, and satellite scene, then build a structured evidence summary." icon={BookOpen} title="Select evidence to begin" /></Card>}

    {generated && selectedObservation && selectedIndicator && selectedScene && <>
      <div className="flex flex-wrap items-center gap-2"><Badge variant="warning" dot>Draft interpretation · not verified</Badge><Badge variant="neutral">{indicatorKind ? indicatorTypeLabel(indicatorKind) : selectedIndicator.code}</Badge><Badge variant={statusVariant(selectedObservation.verificationStatus)}>{selectedObservation.verificationStatus}</Badge><Badge variant={statusVariant(selectedIndicator.status)}>Indicator {selectedIndicator.status}</Badge></div>
      <Card><SectionHeader description="Captured field record selected for this summary." title="Observation" /><dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[["Observation type", selectedObservation.observationType], ["Captured date", formatDate(selectedObservation.capturedAt)], ["Watershed", selectedObservation.watershedName], ["Field evidence ID", selectedObservation.id], ["Description", selectedObservation.description || "Not provided"], ["Coordinates", selectedObservation.latitude === null || selectedObservation.longitude === null ? "Not available" : `${selectedObservation.latitude.toFixed(6)}, ${selectedObservation.longitude.toFixed(6)}`], ["GPS validation", selectedObservation.gpsValidation], ["Review status", selectedObservation.verificationStatus]].map(([label, value]) => <div className="min-w-0 rounded-lg bg-canvas p-3" key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-ink">{value}</dd></div>)}</dl></Card>

      <Card><SectionHeader description="Recorded indicator values and the selected satellite scene; no measurements are inferred from imagery metadata." title="Evidence" /><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-lg border border-line p-3"><p className="text-xs text-muted">Selected indicator</p><p className="mt-1 text-sm font-semibold text-ink">{selectedIndicator.name}</p><p className="mt-1 text-sm text-ink">{formatValue(selectedIndicator.value, selectedIndicator.unit)}</p><p className="mt-1 text-xs text-muted">Observed {formatDate(selectedIndicator.observedAt)}</p></div><div className="rounded-lg border border-line p-3"><p className="text-xs text-muted">Selected satellite scene</p><p className="mt-1 text-sm font-semibold text-ink">{selectedScene.sceneIdentifier}</p><p className="mt-1 text-sm text-muted">{selectedScene.platform ?? "Platform not recorded"}{selectedScene.sensor ? ` / ${selectedScene.sensor}` : ""}</p><p className="mt-1 text-xs text-muted">Acquired {formatDate(selectedScene.acquiredAt)}{selectedScene.resolutionM ? ` / ${selectedScene.resolutionM} m` : ""}</p></div><div className="rounded-lg border border-line p-3"><p className="text-xs text-muted">Linked temporal comparison</p>{comparison && baseline && after ? <><p className="mt-1 text-sm font-semibold text-ink">Before {formatValue(baseline.value, baseline.unit)}</p><p className="mt-1 text-sm font-semibold text-ink">After {formatValue(after.value, after.unit)}</p><p className="mt-1 text-xs text-muted">Stored change {formatValue(comparison.observedChange, selectedIndicator.unit)} / {comparison.status}</p></> : <p className="mt-1 text-sm text-muted">No completed paired comparison is linked to this scene.</p>}</div></div>
      </Card>

      <Card><SectionHeader description="Spatial association among the selected field location, satellite footprint, and any linked change polygon." title="Spatial Context" />{selectedObservation.latitude === null || selectedObservation.longitude === null ? <p className="mt-3 text-sm text-muted">The selected field observation has no valid point location. Other spatial evidence is shown only where recorded.</p> : null}<div className="mt-4"><InsightMap data={spatialFeatures} /></div><p className="mt-2 text-xs text-muted">Same-watershed association does not imply that field and satellite observations are co-located.</p></Card>

      <Card><SectionHeader description="Registered provenance for the selected indicator, scene, and document references." title="Source" /><div className="mt-4 grid gap-4 xl:grid-cols-3"><div><p className="text-xs font-semibold text-ink">Indicator and scene source</p><p className="mt-1 text-sm text-muted">{sourceText}</p><p className="mt-1 text-xs text-muted">Indicator source ID: {selectedIndicator.dataSourceId ?? "Not linked"}</p><p className="mt-1 text-xs text-muted">Satellite scene: {selectedScene.sceneIdentifier} / {selectedScene.rasterReference ?? "Raster reference not recorded"}</p></div><div><p className="text-xs font-semibold text-ink">Selected documents / source references</p>{selectedDocuments.length ? selectedDocuments.map((document) => <div className="mt-2 rounded-lg border border-line p-2.5" key={document.id}><p className="text-sm font-medium text-ink">{document.name}</p><p className="mt-1 text-xs text-muted">{document.organization ?? "Organization not recorded"}{document.license ? ` / ${document.license}` : ""}</p>{document.description && <p className="mt-1 text-xs leading-5 text-muted">{document.description}</p>}{document.url && <p className="mt-1 break-all text-xs text-brand-800">{document.url}</p>}</div>) : <p className="mt-1 text-sm text-muted">No additional document references selected.</p>}</div><div><p className="text-xs font-semibold text-ink">Field evidence provenance</p><p className="mt-1 text-sm text-muted">Record ID {selectedObservation.id}</p><p className="mt-1 text-xs text-muted">Created by {selectedObservation.createdBy ?? "Not recorded"} / {formatDate(selectedObservation.createdAt)}</p><p className="mt-1 text-xs text-muted">Review status {selectedObservation.verificationStatus} / GPS {selectedObservation.gpsValidation}</p></div></div></Card>

      <Card className="border-blue-200 bg-blue-50/40"><SectionHeader description="Generated from selected records using deterministic wording rules; it is not an AI model output." title="Interpretation" /><p className="mt-3 text-sm leading-6 text-ink">{interpretationText()}</p><div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-800" /><p className="text-xs font-medium text-amber-900">Draft only. A qualified reviewer must verify the evidence and interpretation before it is cited or used for decisions.</p></div></Card>

      <ProvenancePanel dataSource={[indicatorSource?.name, sceneSource?.name].filter(Boolean).join(" / ") || null} sourceType="Structured evidence summary" dataset="public.geo_photos / public.indicators / public.satellite_scenes" acquisitionDate={selectedScene.acquiredAt} processingDate={generatedAt} processingMethod="Rule-based template" spatialResolution={selectedScene.resolutionM === null ? null : `${selectedScene.resolutionM} m`} analysisPeriod={baseline && after ? `${formatDate(baseline.observedAt)} to ${formatDate(after.observedAt)}` : null} createdBy={session?.user.id} lastUpdated={generatedAt} sourceReference={[selectedObservation.id, selectedIndicator.id, selectedScene.id, ...selectedDocuments.map((item) => item.id)].join(" / ")} title="Insight provenance" description="The interpretation is an unverified draft. This panel lists its selected source records and generation time." />

      <Card><SectionHeader description="Known limits of the selected records and the first-version interface." title="Limitation" /><ul className="mt-3 space-y-2 text-sm leading-6 text-muted"><li className="flex gap-2"><ShieldAlert aria-hidden="true" className="mt-1 size-4 shrink-0 text-amber-700" />This rule-based interpretation is not a verified government fact or an expert-validated conclusion.</li><li className="flex gap-2"><ShieldAlert aria-hidden="true" className="mt-1 size-4 shrink-0 text-amber-700" />The data shows observed measurements and spatial/temporal association; it does not establish that an intervention caused a change.</li><li className="flex gap-2"><ShieldAlert aria-hidden="true" className="mt-1 size-4 shrink-0 text-amber-700" />Cloud, resolution, acquisition timing, field GPS quality, and incomplete metadata may affect comparability.</li><li className="flex gap-2"><FileCheck2 aria-hidden="true" className="mt-1 size-4 shrink-0 text-amber-700" />Selected source references are provenance pointers; this interface does not retrieve document contents or automatically verify them.</li></ul></Card>
    </>}
  </div>
}

export default AiEvidenceInsights
