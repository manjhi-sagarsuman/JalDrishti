import { useState, useRef, useEffect } from "react"
import { Search, MapPin, Layers, Shield, Camera, X } from "lucide-react"
import { SAMPLE_ADMINISTRATIVE_DATA, SAMPLE_WATERSHEDS, SAMPLE_INTERVENTIONS, SAMPLE_EVIDENCE } from "../../services/sampleGisData"

export interface SearchResultItem {
  id: string
  title: string
  subtitle: string
  type: "administrative" | "watershed" | "intervention" | "evidence"
  coordinates: [number, number]
  raw: any
}

interface GlobalGisSearchProps {
  onSelectFeature?: (item: SearchResultItem) => void
  placeholder?: string
  className?: string
}

export function GlobalGisSearch({ onSelectFeature, placeholder = "Search District, Block, Village, Watershed, ID...", className = "" }: GlobalGisSearchProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const results: SearchResultItem[] = []
  if (query.trim().length >= 2) {
    const q = query.toLowerCase()

    // 1. Search administrative
    SAMPLE_ADMINISTRATIVE_DATA.forEach((adm) => {
      if (adm.name.toLowerCase().includes(q) || adm.code.toLowerCase().includes(q)) {
        results.push({
          id: adm.id,
          title: adm.name,
          subtitle: `${adm.type.toUpperCase()} • ${adm.stateName}`,
          type: "administrative",
          coordinates: adm.center,
          raw: adm
        })
      }
    })

    // 2. Search watersheds
    SAMPLE_WATERSHEDS.forEach((ws) => {
      if (ws.name.toLowerCase().includes(q) || ws.code.toLowerCase().includes(q)) {
        results.push({
          id: ws.id,
          title: ws.name,
          subtitle: `WATERSHED • ${ws.district}, ${ws.block} (${ws.code})`,
          type: "watershed",
          coordinates: ws.coordinates,
          raw: ws
        })
      }
    })

    // 3. Search interventions
    SAMPLE_INTERVENTIONS.forEach((it) => {
      if (it.interventionCode.toLowerCase().includes(q) || it.type.toLowerCase().includes(q) || it.village.toLowerCase().includes(q)) {
        results.push({
          id: it.id,
          title: `${it.type} (${it.interventionCode})`,
          subtitle: `INTERVENTION • ${it.village}, ${it.block}`,
          type: "intervention",
          coordinates: [it.longitude, it.latitude],
          raw: it
        })
      }
    })

    // 4. Search evidence
    SAMPLE_EVIDENCE.forEach((ev) => {
      if (ev.title.toLowerCase().includes(q) || ev.id.toLowerCase().includes(q) || ev.category.toLowerCase().includes(q)) {
        results.push({
          id: ev.id,
          title: ev.title,
          subtitle: `EVIDENCE • ${ev.village} • ${ev.verificationStatus}`,
          type: "evidence",
          coordinates: [ev.longitude, ev.latitude],
          raw: ev
        })
      }
    })
  }

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false)
    setQuery(item.title)
    if (onSelectFeature) {
      onSelectFeature(item)
    } else {
      window.dispatchEvent(new CustomEvent("jaldrishti:search-select", { detail: item }))
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 size-4 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-line bg-white/95 py-2 pl-9 pr-8 text-xs text-ink shadow-sm placeholder:text-muted focus:border-brand-800 focus:outline-none focus:ring-1 focus:ring-brand-800"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setIsOpen(false) }}
            className="absolute right-2.5 text-muted hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 mt-1.5 w-full rounded-xl border border-line bg-white shadow-xl max-h-72 overflow-y-auto z-50 p-1 divide-y divide-line/60">
          {results.length > 0 ? (
            results.slice(0, 10).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors rounded-lg"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-brand-800">
                  {item.type === "administrative" && <MapPin className="size-3.5" />}
                  {item.type === "watershed" && <Layers className="size-3.5" />}
                  {item.type === "intervention" && <Shield className="size-3.5" />}
                  {item.type === "evidence" && <Camera className="size-3.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">{item.title}</p>
                  <p className="truncate text-[10px] text-muted">{item.subtitle}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-muted">
              No GIS features matching "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
