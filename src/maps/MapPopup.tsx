import { mapLayers } from "./mapLayers"
import { ExternalLink, CheckCircle, Clock } from "lucide-react"

export interface MapPopupProps {
  title: string
  layerId?: string
  properties?: Record<string, unknown>
  onViewDetails?: (properties: Record<string, unknown>) => void
}

export function MapPopup({ title, layerId, properties = {}, onViewDetails }: MapPopupProps) {
  const layer = mapLayers.find((item) => item.id === layerId)

  const isEvidence = layerId === "geo-tagged-photos" || Boolean(properties.thumbnail_url || properties.image_url)
  const isWatershed = layerId === "watershed-boundary"
  const isIntervention = layerId?.startsWith("intervention") || layerId === "interventions"

  const thumbnailUrl = (properties.thumbnail_url || properties.image_url) as string | undefined
  const status = (properties.verification_status || properties.status) as string | undefined

  return (
    <article className="min-w-[15rem] max-w-[19rem] text-ink font-sans p-1">
      {isEvidence && thumbnailUrl && (
        <div className="relative mb-2 h-28 w-full overflow-hidden rounded-md bg-slate-100">
          <img
            src={thumbnailUrl}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          {status && (
            <span
              className={`absolute top-1.5 right-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase shadow-sm ${
                status === "VERIFIED"
                  ? "bg-emerald-600 text-white"
                  : status === "REJECTED"
                  ? "bg-red-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {status === "VERIFIED" ? <CheckCircle className="size-3" /> : <Clock className="size-3" />}
              {status}
            </span>
          )}
        </div>
      )}

      {layer && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-800">
          {layer.label}
        </p>
      )}

      <h3 className="mt-0.5 text-sm font-semibold leading-snug">{title}</h3>

      <dl className="mt-2 space-y-1 border-t border-line pt-2 text-xs">
        {isWatershed && (
          <>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">District:</dt>
              <dd className="font-medium">{String(properties.district || "Ahmednagar")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Block:</dt>
              <dd className="font-medium">{String(properties.block || "Parner")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Area:</dt>
              <dd className="font-medium">{String(properties.area_ha || "1,240")} ha</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Interventions:</dt>
              <dd className="font-medium">{String(properties.interventions_count || "38")}</dd>
            </div>
          </>
        )}

        {isIntervention && (
          <>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Type:</dt>
              <dd className="font-medium">{String(properties.type || "Check Dam")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Code:</dt>
              <dd className="font-mono text-[11px] font-medium">{String(properties.intervention_code || properties.id || "N/A")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Village:</dt>
              <dd className="font-medium">{String(properties.village || "Ralegan Siddhi")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Status:</dt>
              <dd className="font-semibold text-brand-800">{String(properties.status || "COMPLETED")}</dd>
            </div>
          </>
        )}

        {isEvidence && (
          <>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Village / Block:</dt>
              <dd className="font-medium">{String(properties.village || "N/A")}, {String(properties.block || "N/A")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">District:</dt>
              <dd className="font-medium">{String(properties.district || "Ahmednagar")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Date:</dt>
              <dd className="font-medium">{String(properties.date || new Date().toISOString().split("T")[0])}</dd>
            </div>
          </>
        )}
      </dl>

      <div className="mt-3 border-t border-line pt-2">
        <button
          type="button"
          onClick={() => {
            if (onViewDetails) {
              onViewDetails(properties)
            } else {
              window.dispatchEvent(new CustomEvent("jaldrishti:view-details", { detail: { properties, layerId, title } }))
            }
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded bg-brand-800 px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-900"
        >
          View Details
          <ExternalLink className="size-3" />
        </button>
      </div>
    </article>
  )
}
