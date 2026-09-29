import { useState, useEffect } from "react"
import { Layers, Shield, Camera, CheckCircle2, MapPin, Building, Plus, RefreshCw, Filter } from "lucide-react"
import { StatCard } from "../../components/StatCard"
import { MapView } from "../../maps"
import { getSampleGisFeatureCollection, SAMPLE_EVIDENCE, SAMPLE_WATERSHEDS, SAMPLE_INTERVENTIONS, type SampleEvidence, type SampleWatershed, type SampleIntervention } from "../../services/sampleGisData"
import { AddEvidenceModal } from "../../components/evidence/AddEvidenceModal"
import { EvidenceDetailModal } from "../../components/evidence/EvidenceDetailModal"
import type { SearchResultItem } from "../../components/search/GlobalGisSearch"
import { fetchEvidenceList } from "../../services/evidenceApiService"
import { fetchWatersheds } from "../../services/watershedApiService"
import { fetchInterventions } from "../../services/interventionApiService"

export function Dashboard() {
  const [data] = useState(getSampleGisFeatureCollection())
  const [evidenceList, setEvidenceList] = useState<SampleEvidence[]>(SAMPLE_EVIDENCE)
  const [watershedList, setWatershedList] = useState<SampleWatershed[]>(SAMPLE_WATERSHEDS)
  const [interventionList, setInterventionList] = useState<SampleIntervention[]>(SAMPLE_INTERVENTIONS)
  const [loading, setLoading] = useState(false)
  const [isAddEvidenceOpen, setIsAddEvidenceOpen] = useState(false)
  const [selectedEvidence, setSelectedEvidence] = useState<Record<string, any> | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<Record<string, any> | null>(null)
  const [filterDistrict, setFilterDistrict] = useState("all")

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [ev, ws, it] = await Promise.all([
        fetchEvidenceList(),
        fetchWatersheds(),
        fetchInterventions()
      ])
      if (ev && ev.length) setEvidenceList(ev)
      if (ws && ws.length) setWatershedList(ws as any)
      if (it && it.length) setInterventionList(it as any)
    } catch {
      // fallback preserved
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()

    const handleSearchSelect = (e: any) => {
      const item: SearchResultItem = e.detail
      if (item && item.raw) {
        setSelectedFeature(item.raw)
      }
    }

    const handleViewDetails = (e: any) => {
      if (e.detail?.properties) {
        setSelectedEvidence(e.detail.properties)
      }
    }

    window.addEventListener("jaldrishti:search-select", handleSearchSelect)
    window.addEventListener("jaldrishti:view-details", handleViewDetails)

    return () => {
      window.removeEventListener("jaldrishti:search-select", handleSearchSelect)
      window.removeEventListener("jaldrishti:view-details", handleViewDetails)
    }
  }, [])

  const totalWatersheds = watershedList.length
  const activeInterventions = interventionList.length
  const geoTaggedEvidenceCount = evidenceList.length
  const verifiedSitesCount = evidenceList.filter((e) => e.verificationStatus === "VERIFIED").length
  const districtsCovered = new Set(watershedList.map((w) => w.district)).size || 1
  const villagesCovered = watershedList.reduce((acc, w) => acc + (w.villagesCount || 1), 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            National Watershed Geospatial Operations
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Real-time geospatial monitoring, hydrological boundaries, and geo-tagged field verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin text-brand-800" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsAddEvidenceOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-900"
          >
            <Plus className="size-4" />
            Add Field Evidence
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={Layers}
          title="Total Watersheds"
          value={totalWatersheds}
          description="Monitored Basins"
        />
        <StatCard
          icon={Shield}
          title="Active Interventions"
          value={activeInterventions}
          description="Check dams & ponds"
        />
        <StatCard
          icon={Camera}
          title="Geo-Tagged Evidence"
          value={geoTaggedEvidenceCount}
          description="Field photos uploaded"
        />
        <StatCard
          icon={CheckCircle2}
          title="Verified Sites"
          value={verifiedSitesCount}
          description="Ground-truth verified"
        />
        <StatCard
          icon={MapPin}
          title="Districts Covered"
          value={districtsCovered}
          description="Operational districts"
        />
        <StatCard
          icon={Building}
          title="Villages Covered"
          value={villagesCovered}
          description="Gram Panchayats"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-2">
          <div className="flex items-center justify-between bg-white border border-line rounded-lg p-2.5 text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-brand-800" />
              <span className="font-semibold text-ink">GIS Filter:</span>
              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                className="rounded border border-line px-2 py-1 bg-white text-xs"
              >
                <option value="all">All Districts</option>
                <option value="Ahmednagar">Ahmednagar</option>
                <option value="Pune">Pune</option>
                <option value="Solapur">Solapur</option>
              </select>
            </div>
            <div className="text-[11px] text-muted">
              MapLibre Vector Engine • WGS84
            </div>
          </div>

          <MapView
            data={data}
            onFeatureSelect={(props) => {
              if (props.thumbnail_url || props.image_url) {
                setSelectedEvidence(props)
              } else {
                setSelectedFeature(props)
              }
            }}
          />
        </div>

        <div className="space-y-4">
          {selectedFeature ? (
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="font-bold text-ink uppercase tracking-wider text-[11px]">Selected Feature</span>
                <button
                  type="button"
                  onClick={() => setSelectedFeature(null)}
                  className="text-muted hover:text-ink text-xs"
                >
                  Clear
                </button>
              </div>
              <h3 className="font-bold text-sm text-brand-900 leading-snug">
                {selectedFeature.name || selectedFeature.title || "Feature Details"}
              </h3>
              <dl className="space-y-1.5 divide-y divide-line/60">
                {Object.entries(selectedFeature)
                  .filter(([k]) => !["thumbnail_url", "image_url", "raw"].includes(k))
                  .slice(0, 7)
                  .map(([key, val]) => (
                    <div key={key} className="pt-1.5 flex justify-between gap-2">
                      <dt className="text-muted capitalize text-[11px]">{key.replace(/_/g, " ")}</dt>
                      <dd className="font-medium text-ink truncate max-w-[10rem]">{String(val)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-white p-4 shadow-sm text-xs space-y-3">
              <h3 className="font-bold text-ink uppercase tracking-wider text-[11px] border-b border-line pb-2">
                Recent Geo-Tagged Evidence
              </h3>
              <div className="space-y-2.5 max-h-[30rem] overflow-y-auto">
                {evidenceList.slice(0, 5).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvidence(ev)}
                    className="flex items-center gap-2.5 rounded-lg border border-line p-2 hover:bg-slate-50 cursor-pointer transition"
                  >
                    <img
                      src={ev.thumbnailUrl}
                      alt={ev.title}
                      className="size-12 rounded object-cover border border-line shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-ink truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted truncate">
                        {ev.village}, {ev.district}
                      </p>
                      <span className="inline-block mt-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                        {ev.verificationStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AddEvidenceModal
        open={isAddEvidenceOpen}
        onClose={() => setIsAddEvidenceOpen(false)}
        onSuccess={loadDashboardData}
      />

      <EvidenceDetailModal
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  )
}

export default Dashboard
