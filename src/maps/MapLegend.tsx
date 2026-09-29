import { mapLayers, type MapLayerId } from "./mapLayers"

interface MapLegendProps {
  visibleLayers: readonly MapLayerId[]
  className?: string
}

export function MapLegend({ visibleLayers, className = "" }: MapLegendProps) {
  const activeLayers = mapLayers.filter((layer) => visibleLayers.includes(layer.id))

  return (
    <aside aria-label="Map legend" className={`max-w-[14rem] rounded-lg border border-line bg-white/95 p-3 shadow-md backdrop-blur ${className}`}>
      <h2 className="text-xs font-semibold text-ink">Legend</h2>
      {activeLayers.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {activeLayers.map((layer) => (
            <li className="flex items-center gap-2 text-[11px] text-muted" key={layer.id}>
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: layer.color }} />
              {layer.label}
            </li>
          ))}
        </ul>
      ) : <p className="mt-1.5 text-[11px] text-muted">No overlay layers selected.</p>}
    </aside>
  )
}
