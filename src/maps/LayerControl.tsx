import { useState } from "react"
import { Layers3, ChevronDown, ChevronRight, Sliders } from "lucide-react"
import { mapLayers, type MapLayerCategory, type MapLayerId } from "./mapLayers"

export type BaseMapId = "streets" | "satellite" | "terrain" | "dark" | "light"

interface LayerControlProps {
  visibleLayers: readonly MapLayerId[]
  onLayerToggle: (id: MapLayerId) => void
  baseMap: BaseMapId
  onBaseMapChange: (id: BaseMapId) => void
  layerOpacities?: Record<string, number>
  onOpacityChange?: (id: MapLayerId, opacity: number) => void
  className?: string
}

const CATEGORIES: MapLayerCategory[] = [
  "ADMINISTRATIVE",
  "WATERSHED",
  "INTERVENTIONS",
  "EVIDENCE",
  "THEMATIC",
  "CHANGE"
]

export function LayerControl({
  visibleLayers,
  onLayerToggle,
  baseMap,
  onBaseMapChange,
  layerOpacities = {},
  onOpacityChange,
  className = ""
}: LayerControlProps) {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    THEMATIC: true,
    CHANGE: true
  })
  const [showOpacitySliders, setShowOpacitySliders] = useState(false)

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  return (
    <section aria-label="GIS Map Layers" className={`w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-line bg-white/95 shadow-xl backdrop-blur-md ${className}`}>
      <header className="flex items-center justify-between border-b border-line px-3.5 py-2.5 bg-slate-50/80">
        <div className="flex items-center gap-2">
          <Layers3 aria-hidden="true" className="size-4 text-brand-800" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink">GIS Layer Controls</h2>
        </div>
        <button
          onClick={() => setShowOpacitySliders((v) => !v)}
          className={`p-1 rounded text-xs transition-colors ${showOpacitySliders ? "bg-blue-100 text-brand-900" : "text-muted hover:text-ink"}`}
          title="Toggle Opacity Sliders"
          type="button"
        >
          <Sliders className="size-3.5" />
        </button>
      </header>

      <div className="max-h-[min(65vh,32rem)] overflow-y-auto p-3 space-y-3.5 text-xs">
        {/* Basemap Switcher */}
        <fieldset>
          <legend className="mb-2 text-[10px] font-bold tracking-wider text-muted uppercase">Base Maps</legend>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {(["streets", "satellite", "terrain", "dark", "light"] as BaseMapId[]).map((mode) => {
              const active = baseMap === mode
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onBaseMapChange(mode)}
                  className={`rounded border px-1.5 py-1 text-[11px] font-medium capitalize transition-all ${
                    active ? "border-brand-700 bg-blue-50 text-brand-900 shadow-sm" : "border-line bg-white text-ink hover:bg-canvas"
                  }`}
                >
                  {mode}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Categories */}
        <div className="space-y-2 border-t border-line/60 pt-2.5">
          {CATEGORIES.map((category) => {
            const items = mapLayers.filter((l) => l.category === category)
            if (items.length === 0) return null
            const isCollapsed = collapsedCategories[category]
            const activeCount = items.filter((l) => visibleLayers.includes(l.id)).length

            return (
              <div key={category} className="rounded-lg border border-line/60 bg-white p-2">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between text-left text-[11px] font-bold tracking-wider text-muted hover:text-ink"
                >
                  <span className="flex items-center gap-1.5">
                    {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                    {category}
                  </span>
                  {activeCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-semibold text-brand-800">
                      {activeCount}
                    </span>
                  )}
                </button>

                {!isCollapsed && (
                  <div className="mt-2 space-y-1.5 pl-2">
                    {items.map((layer) => {
                      const isVisible = visibleLayers.includes(layer.id)
                      const opacity = layerOpacities[layer.id] ?? 100

                      return (
                        <div key={layer.id} className="space-y-1">
                          <label className="flex cursor-pointer items-center justify-between gap-2 rounded py-0.5 text-xs text-ink hover:bg-slate-50">
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={() => onLayerToggle(layer.id)}
                                className="size-3.5 rounded border-line accent-blue-800"
                              />
                              <span
                                aria-hidden="true"
                                className="size-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: layer.color }}
                              />
                              <span className="line-clamp-1">{layer.label}</span>
                            </span>
                          </label>

                          {showOpacitySliders && isVisible && layer.hasOpacity && (
                            <div className="flex items-center gap-2 pl-6 pr-2">
                              <span className="text-[10px] text-muted">Opacity</span>
                              <input
                                type="range"
                                min="10"
                                max="100"
                                value={opacity}
                                onChange={(e) => onOpacityChange?.(layer.id, Number(e.target.value))}
                                className="h-1 flex-1 accent-blue-800 cursor-pointer"
                              />
                              <span className="text-[10px] text-muted w-6 text-right">{opacity}%</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
