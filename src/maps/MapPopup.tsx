import { mapLayers } from "./mapLayers"
import { ExternalLink, CheckCircle, Clock, AlertTriangle } from "lucide-react"

export interface MapPopupProps {
  title: string
  layerId?: string
  properties?: Record<string, unknown>
  onViewDetails?: (properties: Record<string, unknown>) => void
}

function displayValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

export function MapPopup({ title, layerId, properties = {}, onViewDetails }: MapPopupProps) {
  const layer = mapLayers.find((item) => item.id === layerId)

  const isEvidence = layerId === "geo-tagged-photos" || Boolean(properties.thumbnail_url || properties.image_url)
  const isWatershed = layerId === "watershed-boundary"
  const isIntervention = layerId?.startsWith("intervention") || layerId === "interventions"
  const isSatellite = layerId === "satellite-scenes"

  const thumbnailUrl = (properties.thumbnail_url || properties.image_url) as string | undefined
  const status = (properties.verification_status || properties.status) as string | undefined
  const category = (properties.category || properties.type) as string | undefined
  const village = (properties.village || properties.village_name) as string | undefined
  const block = (properties.block || properties.block_name) as string | undefined
  const district = (properties.district || properties.district_name) as string | undefined
  const date = (properties.date || properties.captured_at || properties.implementation_date || properties.acquisitionDate || properties.acquired_at) as string | undefined

  // Satellite scene specific properties
  const sceneId = (properties.sceneId || properties.scene_id || properties.title) as string | undefined
  const platform = (properties.platform) as string | undefined
  const sensor = (properties.sensor) as string | undefined
  const cloudCover = properties.cloudCover ?? properties.cloud_cover ?? properties.cloud_cover_percent
  const watershed = (properties.watershed || properties.watershed_code) as string | undefined
  const assetRef = (properties.assetReference || properties.asset_reference_path || properties.asset_path) as string | undefined

  return (
    <article className="min-w-[15rem] max-w-[19rem] text-ink font-sans p-1">
      {isEvidence && thumbnailUrl && (
        <div className="relative mb-2 h-28 w-full overflow-hidden rounded-md bg-slate-900 flex items-center justify-center">
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
              {status === "VERIFIED" ? (
                <CheckCircle className="size-3" />
              ) : status === "REJECTED" ? (
                <AlertTriangle className="size-3" />
              ) : (
                <Clock className="size-3" />
              )}
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
        {isEvidence && (
          <>
            {category && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Category:</dt>
                <dd className="font-medium text-brand-800">{category}</dd>
              </div>
            )}
            {(village || block) && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Village / Block:</dt>
                <dd className="font-medium">{[village, block].filter(Boolean).join(", ")}</dd>
              </div>
            )}
            {district && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">District:</dt>
                <dd className="font-medium">{district}</dd>
              </div>
            )}
            {date && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Captured Date:</dt>
                <dd className="font-medium">{date.split("T")[0]}</dd>
              </div>
            )}
          </>
        )}

        {isWatershed && (
          <>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">District:</dt>
              <dd className="font-medium">{String(properties.district || "Pune")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Block:</dt>
              <dd className="font-medium">{String(properties.block || "Haveli")}</dd>
            </div>
            {properties.areaKm2 && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Area:</dt>
                <dd className="font-medium">{String(properties.areaKm2)} km²</dd>
              </div>
            )}
          </>
        )}

        {isIntervention && (
          <>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Type:</dt>
              <dd className="font-medium">{String(properties.type || "Intervention")}</dd>
            </div>
            {properties.code && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Code:</dt>
                <dd className="font-mono text-[11px] font-medium">{String(properties.code)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Status:</dt>
              <dd className="font-semibold text-brand-800">{String(properties.status || "PLANNED")}</dd>
            </div>
          </>
        )}

        {isSatellite && (
          <>
            {(platform || sensor) && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Platform / Sensor:</dt>
                <dd className="font-medium text-brand-800">{[platform, sensor].filter(Boolean).join(" · ")}</dd>
              </div>
            )}
            {watershed && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Watershed:</dt>
                <dd className="font-medium">{watershed}</dd>
              </div>
            )}
            {date && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Acquired:</dt>
                <dd className="font-medium">{date.split("T")[0]}</dd>
              </div>
            )}
            {cloudCover !== null && cloudCover !== undefined && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Cloud Cover:</dt>
                <dd className="font-medium">{String(cloudCover)}%</dd>
              </div>
            )}
            {assetRef && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Asset Ref:</dt>
                <dd className="truncate max-w-[120px] font-mono text-[10px] text-muted" title={assetRef}>{assetRef}</dd>
              </div>
            )}
          </>
        )}

        {!isEvidence && !isWatershed && !isIntervention && !isSatellite && (
          Object.entries(properties)
            .filter(([key]) => key !== "layerId" && key !== "title" && key !== "id")
            .map(([key, value]) => [key, displayValue(value)] as const)
            .filter((row): row is readonly [string, string] => row[1] !== null)
            .slice(0, 4)
            .map(([key, val]) => (
              <div className="flex justify-between gap-4 text-xs" key={key}>
                <dt className="capitalize text-muted">{key.replaceAll("_", " ")}</dt>
                <dd className="text-right font-medium">{val}</dd>
              </div>
            ))
        )}
      </dl>

      <div className="mt-3 border-t border-line pt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (onViewDetails) {
              onViewDetails(properties)
            } else {
              window.dispatchEvent(
                new CustomEvent("jaldrishti:view-details", {
                  detail: { properties, layerId, title, sceneId: sceneId || properties.id }
                })
              )
            }
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded bg-brand-800 px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-900"
        >
          View Details
          <ExternalLink className="size-3" />
        </button>
      </div>
    </article>
  )
}
