import { useState, useEffect } from "react"
import { Plus, Filter, RefreshCw, CheckCircle, Clock } from "lucide-react"
import { fetchEvidenceList } from "../services/evidenceApiService"
import { SAMPLE_EVIDENCE, type SampleEvidence } from "../services/sampleGisData"
import { AddEvidenceModal } from "../components/evidence/AddEvidenceModal"
import { EvidenceDetailModal } from "../components/evidence/EvidenceDetailModal"

export function ImagesPage() {
  const [evidenceList, setEvidenceList] = useState<SampleEvidence[]>(SAMPLE_EVIDENCE)
  const [loading, setLoading] = useState(false)
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [activeDetail, setActiveDetail] = useState<Record<string, any> | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const list = await fetchEvidenceList()
      if (list && list.length) setEvidenceList(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filtered = evidenceList.filter((item) => {
    if (filterCategory !== "all" && item.category !== filterCategory) return false
    if (filterStatus !== "all" && item.verificationStatus !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Geo-Tagged Field Verification Gallery</h1>
          <p className="text-xs text-muted mt-0.5">
            Photographic proof of watershed structures, check dams, afforestation, and water bodies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink hover:bg-slate-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-900"
          >
            <Plus className="size-4" />
            Upload Evidence
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-brand-800" />
          <span className="font-semibold text-ink">Category:</span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded border border-line px-2 py-1 bg-white text-xs"
          >
            <option value="all">All Categories</option>
            <option value="Water Structure">Water Structure</option>
            <option value="Farm Pond">Farm Pond</option>
            <option value="Percolation Tank">Percolation Tank</option>
            <option value="Contour Trench">Contour Trench</option>
            <option value="Plantation">Plantation</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded border border-line px-2 py-1 bg-white text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div className="ml-auto text-muted">
          Showing {filtered.length} records
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveDetail(item)}
            className="group rounded-xl border border-line bg-white overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
          >
            <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                loading="lazy"
              />
              <span
                className={`absolute top-2 right-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shadow-sm ${
                  item.verificationStatus === "VERIFIED"
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-500 text-white"
                }`}
              >
                {item.verificationStatus === "VERIFIED" ? <CheckCircle className="size-3" /> : <Clock className="size-3" />}
                {item.verificationStatus}
              </span>
            </div>
            <div className="p-3.5 space-y-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-brand-800 tracking-wider">
                {item.category}
              </span>
              <h3 className="font-semibold text-ink text-sm truncate">{item.title}</h3>
              <p className="text-[11px] text-muted truncate">
                {item.village}, {item.block}, {item.district}
              </p>
              <div className="pt-2 border-t border-line flex justify-between text-[10px] text-muted font-mono">
                <span>{item.latitude.toFixed(4)}° N, {item.longitude.toFixed(4)}° E</span>
                <span>{item.uploadedAt.split("T")[0]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddEvidenceModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={loadData}
      />

      <EvidenceDetailModal
        evidence={activeDetail}
        onClose={() => setActiveDetail(null)}
      />
    </div>
  )
}

export default ImagesPage
