import { useState, useRef, type ChangeEvent, type FormEvent } from "react"
import { Camera, Crosshair, MapPin, UploadCloud, X, Check, Loader2, AlertCircle } from "lucide-react"
import { submitEvidenceRecord, uploadEvidenceImage, type EvidencePayload } from "../../services/evidenceApiService"
import { useAuth } from "../../hooks/useAuth"

interface AddEvidenceModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  initialCoordinates?: { latitude: number; longitude: number }
}

export function AddEvidenceModal({ open, onClose, onSuccess, initialCoordinates }: AddEvidenceModalProps) {
  const { session } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Step state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Location method: "current" | "map" | "manual"
  const [locOption, setLocOption] = useState<"current" | "map" | "manual">("current")
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)

  // Form Fields
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("Water Structure")
  const [latitude, setLatitude] = useState<string>(initialCoordinates ? String(initialCoordinates.latitude) : "19.0245")
  const [longitude, setLongitude] = useState<string>(initialCoordinates ? String(initialCoordinates.longitude) : "74.4382")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [district, setDistrict] = useState("Ahmednagar")
  const [block, setBlock] = useState("Parner")
  const [village, setVillage] = useState("Ralegan Siddhi")
  const [watershedId, setWatershedId] = useState("ws-ahm-01")
  const [interventionId, setInterventionId] = useState("int-001")

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  if (!open) return null

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleUseCurrentLocation = () => {
    setLocOption("current")
    setLocError(null)
    if (!navigator.geolocation) {
      setLocError("Browser does not support geolocation.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        setLatitude(pos.coords.latitude.toFixed(6))
        setLongitude(pos.coords.longitude.toFixed(6))
      },
      (err) => {
        setLocating(false)
        setLocError(err.message || "Could not retrieve GPS coordinates.")
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedFile && !previewUrl) {
      setSubmitError("Please take a photo or select an image to upload.")
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      let finalImageUrl = "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=800&q=80"
      if (selectedFile) {
        const uploadResult = await uploadEvidenceImage(selectedFile)
        finalImageUrl = uploadResult.publicUrl
      }

      const email = session?.user.email
      const payload: EvidencePayload = {
        title: title || "Field Inspection Photo",
        description,
        category,
        watershedId,
        interventionId: interventionId || null,
        district,
        block,
        village,
        latitude: parseFloat(latitude) || 19.02,
        longitude: parseFloat(longitude) || 74.43,
        date,
        uploadedBy: email ? email.split("@")[0] : "Field Officer",
        verificationStatus: "PENDING",
        imageUrl: finalImageUrl,
        thumbnailUrl: finalImageUrl
      }

      await submitEvidenceRecord(payload)
      setSubmitting(false)
      setSubmitSuccess(true)
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1200)
    } catch (err) {
      setSubmitting(false)
      setSubmitError(err instanceof Error ? err.message : "Evidence upload failed. Try again.")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-white shadow-2xl overflow-hidden my-6">
        <header className="flex items-center justify-between border-b border-line px-5 py-4 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-ink">Add Geo-Tagged Evidence</h2>
            <p className="text-xs text-muted">Upload field verification photograph and geospatial metadata</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-slate-200 hover:text-ink"
          >
            <X className="size-5" />
          </button>
        </header>

        {submitSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="size-6" />
            </div>
            <h3 className="text-base font-bold text-ink">Evidence Uploaded Successfully</h3>
            <p className="text-xs text-muted">The record has been stored and pinned to the GIS map.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
            {/* Step 1: Camera or File Upload */}
            <div className="space-y-2">
              <label className="font-semibold text-ink">1. Field Image / Photo</label>
              {previewUrl ? (
                <div className="relative h-44 w-full rounded-xl overflow-hidden border border-line bg-slate-100">
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null) }}
                    className="absolute top-2 right-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-800 bg-blue-50/50 p-4 text-brand-900 transition hover:bg-blue-50"
                  >
                    <Camera className="size-5 text-brand-800" />
                    <span className="font-semibold text-xs">Take Photo</span>
                    <span className="text-[10px] text-muted">Device camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-slate-50 p-4 text-ink transition hover:bg-slate-100"
                  >
                    <UploadCloud className="size-5 text-muted" />
                    <span className="font-semibold text-xs">Browse Files</span>
                    <span className="text-[10px] text-muted">Gallery / JPEG, PNG</span>
                  </button>
                </div>
              )}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Step 2: Location Selection */}
            <div className="space-y-2">
              <label className="font-semibold text-ink">2. Geospatial Coordinates</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                    locOption === "current" ? "border-brand-700 bg-blue-50 text-brand-900" : "border-line text-ink"
                  }`}
                >
                  <Crosshair className="size-3" />
                  GPS Location
                </button>
                <button
                  type="button"
                  onClick={() => setLocOption("map")}
                  className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                    locOption === "map" ? "border-brand-700 bg-blue-50 text-brand-900" : "border-line text-ink"
                  }`}
                >
                  <MapPin className="size-3" />
                  Pick on Map
                </button>
                <button
                  type="button"
                  onClick={() => setLocOption("manual")}
                  className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                    locOption === "manual" ? "border-brand-700 bg-blue-50 text-brand-900" : "border-line text-ink"
                  }`}
                >
                  Manual Entry
                </button>
              </div>

              {locating && (
                <div className="flex items-center gap-2 text-xs text-brand-800">
                  <Loader2 className="size-3.5 animate-spin" />
                  Acquiring accurate GPS satellite fix...
                </div>
              )}
              {locError && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {locError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                    className="w-full rounded-md border border-line px-2.5 py-1.5 font-mono text-xs focus:border-brand-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                    className="w-full rounded-md border border-line px-2.5 py-1.5 font-mono text-xs focus:border-brand-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Metadata Details */}
            <div className="space-y-2">
              <label className="font-semibold text-ink">3. Metadata & Identification</label>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-muted">Evidence Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Masonry Check Dam Spillway Check"
                    required
                    className="w-full rounded-md border border-line px-2.5 py-1.5 text-xs focus:border-brand-700 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted">Watershed Area</label>
                    <select
                      value={watershedId}
                      onChange={(e) => setWatershedId(e.target.value)}
                      className="w-full rounded-md border border-line px-2 py-1.5 text-xs bg-white focus:border-brand-700 focus:outline-none"
                    >
                      <option value="ws-ahm-01">Ralegan Upper Catchment</option>
                      <option value="ws-ahm-02">Hivre Micro-Watershed A</option>
                      <option value="ws-pun-01">Purandar Karha Basin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">Linked Intervention</label>
                    <select
                      value={interventionId}
                      onChange={(e) => setInterventionId(e.target.value)}
                      className="w-full rounded-md border border-line px-2 py-1.5 text-xs bg-white focus:border-brand-700 focus:outline-none"
                    >
                      <option value="int-001">Check Dam (CD-RLG-01)</option>
                      <option value="int-002">Farm Pond (FP-RLG-04)</option>
                      <option value="int-003">Percolation Tank (PT-HVR-02)</option>
                      <option value="int-004">Contour Trench (CT-HVR-07)</option>
                      <option value="int-005">Plantation (PL-PUR-01)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-md border border-line px-2 py-1.5 text-xs bg-white focus:border-brand-700 focus:outline-none"
                    >
                      <option value="Water Structure">Water Structure</option>
                      <option value="Farm Pond">Farm Pond</option>
                      <option value="Check Dam">Check Dam</option>
                      <option value="Percolation Tank">Percolation Tank</option>
                      <option value="Contour Trench">Contour Trench</option>
                      <option value="Plantation">Plantation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">Inspection Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-md border border-line px-2.5 py-1.5 text-xs focus:border-brand-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted">District</label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full rounded-md border border-line px-2 py-1.5 text-xs focus:border-brand-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">Block</label>
                    <input
                      type="text"
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      className="w-full rounded-md border border-line px-2 py-1.5 text-xs focus:border-brand-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted">Village</label>
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      className="w-full rounded-md border border-line px-2 py-1.5 text-xs focus:border-brand-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted">Description / Field Observations</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter observation notes, water level, structural condition..."
                    className="w-full rounded-md border border-line px-2.5 py-1.5 text-xs focus:border-brand-700 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {submitError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line px-4 py-2 font-medium text-ink hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 rounded-lg bg-brand-800 px-5 py-2 font-semibold text-white shadow-sm hover:bg-brand-900 disabled:opacity-50"
              >
                {submitting && <Loader2 className="size-3.5 animate-spin" />}
                {submitting ? "Uploading..." : "Save Evidence"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
