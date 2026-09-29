import { Card, SectionHeader } from "./ui"

export interface ProvenancePanelProps {
  dataSource?: string | null
  sourceType?: string | null
  dataset?: string | null
  acquisitionDate?: string | null
  processingDate?: string | null
  processingMethod?: string | null
  spatialResolution?: string | number | null
  analysisPeriod?: string | null
  createdBy?: string | null
  lastUpdated?: string | null
  sourceReference?: string | null
  title?: string
  description?: string
}

function display(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not recorded"
  return String(value)
}

export function ProvenancePanel({ title = "Data provenance", description = "Recorded source and processing details for this item.", ...provenance }: ProvenancePanelProps) {
  const fields: Array<[string, string | number | null | undefined]> = [
    ["Data source", provenance.dataSource], ["Source type", provenance.sourceType], ["Dataset", provenance.dataset],
    ["Acquisition date", provenance.acquisitionDate], ["Processing date", provenance.processingDate],
    ["Processing method", provenance.processingMethod], ["Spatial resolution", provenance.spatialResolution],
    ["Analysis period", provenance.analysisPeriod], ["Created by", provenance.createdBy],
    ["Last updated", provenance.lastUpdated], ["Source reference", provenance.sourceReference],
  ]
  return <Card><SectionHeader description={description} title={title} /><dl className="mt-4 grid gap-x-6 divide-y divide-line sm:grid-cols-2 sm:divide-y-0">{fields.map(([label, value]) => <div className="flex min-w-0 items-start justify-between gap-3 border-b border-line py-2.5 first:pt-0 sm:odd:pr-3" key={label}><dt className="shrink-0 text-xs text-muted">{label}</dt><dd className="break-all text-right text-xs font-medium text-ink">{display(value)}</dd></div>)}</dl></Card>
}
