import { mapLayers } from "./mapLayers"

export interface MapPopupProps {
  title: string
  layerId?: string
  properties?: Record<string, unknown>
}

function displayValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  return null
}

export function MapPopup({ title, layerId, properties = {} }: MapPopupProps) {
  const layer = mapLayers.find((item) => item.id === layerId)
  const rows = Object.entries(properties)
    .filter(([key]) => key !== "layerId" && key !== "title" && key !== "id")
    .map(([key, value]) => [key, displayValue(value)] as const)
    .filter((row): row is readonly [string, string] => row[1] !== null)
    .slice(0, 6)

  return (
    <article className="min-w-48 max-w-64 p-1 text-ink">
      {layer && <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700">{layer.label}</p>}
      <h2 className="mt-0.5 text-sm font-semibold">{title}</h2>
      {rows.length > 0 && <dl className="mt-2 space-y-1 border-t border-line pt-2">{rows.map(([key, value]) => <div className="flex justify-between gap-4 text-xs" key={key}><dt className="capitalize text-muted">{key.replaceAll("_", " ")}</dt><dd className="text-right font-medium">{value}</dd></div>)}</dl>}
      {!layer && <p className="mt-1 text-[11px] text-muted">Map feature</p>}
    </article>
  )
}
