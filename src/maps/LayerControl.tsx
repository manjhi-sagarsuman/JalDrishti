import { Layers3 } from "lucide-react"
import { mapLayers, type MapLayerId } from "./mapLayers"

export type BaseMapId = "streets" | "satellite"

interface LayerControlProps {
  visibleLayers: readonly MapLayerId[]
  onLayerToggle: (id: MapLayerId) => void
  baseMap: BaseMapId
  onBaseMapChange: (id: BaseMapId) => void
  satelliteAvailable: boolean
}

const categories = ["WATERSHED", "FIELD EVIDENCE", "HYDROLOGY", "THEMATIC", "CHANGE"] as const

export function LayerControl({ visibleLayers, onLayerToggle, baseMap, onBaseMapChange, satelliteAvailable }: LayerControlProps) {
  return (
    <section aria-label="Map layers" className="w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-white/95 shadow-lg backdrop-blur">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <Layers3 aria-hidden="true" className="size-4 text-brand-800" />
        <h2 className="text-sm font-semibold text-ink">Map layers</h2>
      </header>
      <div className="max-h-[min(70vh,34rem)] overflow-y-auto p-3">
        <fieldset>
          <legend className="mb-2 text-[10px] font-bold tracking-[0.12em] text-muted">BASE MAP</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium ${baseMap === "streets" ? "border-brand-700 bg-blue-50 text-brand-900" : "border-line text-ink"}`}>
              <input checked={baseMap === "streets"} className="accent-blue-800" name="basemap" onChange={() => onBaseMapChange("streets")} type="radio" /> Streets
            </label>
            <label aria-disabled={!satelliteAvailable} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium ${!satelliteAvailable ? "cursor-not-allowed border-line bg-slate-50 text-muted" : baseMap === "satellite" ? "cursor-pointer border-brand-700 bg-blue-50 text-brand-900" : "cursor-pointer border-line text-ink"}`} title={satelliteAvailable ? "Use the configured satellite style" : "Satellite imagery is unavailable until a provider style is supplied."}>
              <input checked={baseMap === "satellite"} className="accent-blue-800" disabled={!satelliteAvailable} name="basemap" onChange={() => onBaseMapChange("satellite")} type="radio" /> Satellite
            </label>
          </div>
          {!satelliteAvailable && <p className="mt-1.5 text-[10px] leading-4 text-muted">Satellite imagery requires a configured style URL.</p>}
        </fieldset>
        <div className="mt-4 space-y-3">
          {categories.map((category) => (
            <fieldset key={category}>
              <legend className="mb-1.5 text-[10px] font-bold tracking-[0.12em] text-muted">{category}</legend>
              <div className="space-y-1">
                {mapLayers.filter((layer) => layer.category === category).map((layer) => (
                  <label className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-1.5 text-xs text-ink hover:bg-canvas" key={layer.id}>
                    <input checked={visibleLayers.includes(layer.id)} className="size-3.5 accent-blue-800" onChange={() => onLayerToggle(layer.id)} type="checkbox" />
                    <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
                    {layer.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>
    </section>
  )
}
