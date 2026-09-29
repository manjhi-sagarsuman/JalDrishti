import { useState } from "react"
import { FileText } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { isWithinRouteDateRange, readRouteDateRange } from "../lib/routeScope"
import { Breadcrumbs } from "../components/Breadcrumbs"
import { ProvenancePanel } from "../components/ProvenancePanel"
import { Card, EmptyState, PageHeader } from "../components/ui"

interface ReportDraft {
  type?: string
  watershedId?: string
  watershedName?: string
  indicator?: string
  beforeDate?: string
  afterDate?: string
  beforeValue?: number
  afterValue?: number
  changeValue?: number | null
  provenance?: Record<string, string | null>
}

function readDrafts(): ReportDraft[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem("jaldrishti-report-drafts") ?? "[]")
    return Array.isArray(parsed) ? parsed.filter((item): item is ReportDraft => typeof item === "object" && item !== null) : []
  } catch { return [] }
}

export default function ReportsPage() {
  const [searchParams] = useSearchParams()
  const watershedId = searchParams.get("watershed")
  const dateRange = readRouteDateRange(searchParams)
  const [drafts] = useState<ReportDraft[]>(readDrafts)
  const visibleDrafts = drafts.filter((draft) => (!watershedId || draft.watershedId === watershedId) && isWithinRouteDateRange(draft.afterDate ?? null, dateRange))
  return <div className="page-section">
    <PageHeader breadcrumbs={<Breadcrumbs items={[{ label: "Reports" }]} />} description="Review report drafts and the provenance captured with each result." eyebrow="Reporting" title="Reports" />
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Report drafts are stored in this browser session. No report file or server-side record has been created.</p>
    {!visibleDrafts.length ? <Card><EmptyState description={drafts.length && watershedId ? "There are no report drafts for this watershed in the current session." : "Add a temporal comparison from Change Detection to see its report draft and source references here."} icon={FileText} title="No report drafts in this session" /></Card> : visibleDrafts.map((draft, index) => <section className="space-y-3" key={`${draft.type ?? "draft"}-${index}`}><Card><h2 className="text-base font-semibold text-ink">{draft.indicator ?? draft.type ?? "Analysis draft"}</h2><p className="mt-1 text-sm text-muted">{draft.watershedName ?? "Watershed not recorded"} · {draft.beforeDate ?? "Not recorded"} to {draft.afterDate ?? "Not recorded"}</p><p className="mt-2 text-xs text-muted">Before {draft.beforeValue ?? "Not recorded"} · After {draft.afterValue ?? "Not recorded"} · Observed change {draft.changeValue ?? "Not recorded"}</p></Card><ProvenancePanel {...(draft.provenance ?? {})} title="Report draft provenance" description="Provenance retained from the selected analysis when this session draft was created." /></section>)}
  </div>
}
