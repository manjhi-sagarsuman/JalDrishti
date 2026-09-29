import { X, CheckCircle, Clock, MapPin, Calendar, User, ShieldCheck } from "lucide-react"

interface EvidenceDetailModalProps {
  evidence: Record<string, any> | null
  onClose: () => void
}

export function EvidenceDetailModal({ evidence, onClose }: EvidenceDetailModalProps) {
  if (!evidence) return null

  const title = evidence.title || evidence.name || "Geo-tagged Evidence"
  const imageUrl = evidence.image_url || evidence.thumbnail_url || "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=1200&q=80"
  const status = evidence.verification_status || evidence.status || "VERIFIED"
  const date = evidence.date || evidence.captured_at || evidence.uploadedAt || "2025-10-12"
  const lat = evidence.latitude ? Number(evidence.latitude).toFixed(5) : "19.02450"
  const lng = evidence.longitude ? Number(evidence.longitude).toFixed(5) : "74.43820"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-slate-50">
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                status === "VERIFIED"
                  ? "bg-emerald-100 text-emerald-800"
                  : status === "REJECTED"
                  ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {status === "VERIFIED" ? <CheckCircle className="size-3" /> : <Clock className="size-3" />}
              {status}
            </span>
            <h2 className="text-sm font-bold text-ink truncate max-w-md">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-slate-200 hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="overflow-y-auto p-5 space-y-4 text-xs">
          {/* High Resolution Preview */}
          <div className="relative h-72 w-full rounded-xl overflow-hidden bg-slate-100 border border-line">
            <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-xl p-3 border border-line">
            <div>
              <p className="text-[10px] text-muted uppercase font-semibold">Location</p>
              <p className="font-medium text-ink flex items-center gap-1 mt-0.5">
                <MapPin className="size-3 text-brand-800" />
                {evidence.village || "Ralegan Siddhi"}, {evidence.district || "Ahmednagar"}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase font-semibold">Coordinates</p>
              <p className="font-mono text-ink mt-0.5">
                {lat}° N, {lng}° E
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase font-semibold">Captured Date</p>
              <p className="font-medium text-ink flex items-center gap-1 mt-0.5">
                <Calendar className="size-3 text-brand-800" />
                {date}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase font-semibold">Inspector</p>
              <p className="font-medium text-ink flex items-center gap-1 mt-0.5">
                <User className="size-3 text-brand-800" />
                {evidence.uploaded_by || evidence.uploadedBy || "Field Surveyor"}
              </p>
            </div>
          </div>

          {/* Description */}
          {evidence.description && (
            <div>
              <h3 className="font-semibold text-ink mb-1">Field Observation Summary</h3>
              <p className="rounded-lg border border-line bg-white p-3 text-muted leading-relaxed">
                {evidence.description}
              </p>
            </div>
          )}

          {/* Intervention Reference */}
          {evidence.intervention_name && (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/60 p-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-brand-800">Linked Watershed Intervention</p>
                <p className="text-xs font-semibold text-brand-900 mt-0.5">{evidence.intervention_name}</p>
              </div>
              <ShieldCheck className="size-5 text-brand-800" />
            </div>
          )}
        </div>

        <footer className="border-t border-line px-5 py-3 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-800 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-900"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}
