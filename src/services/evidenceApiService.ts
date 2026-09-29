import { apiRequest, isApiConfigured } from "./apiClient"
import { getSupabaseClient } from "../lib/supabase"

export interface EvidenceRecord {
  id: string
  title: string
  description?: string
  category: string
  watershedId: string
  interventionId: string | null
  district: string
  block: string
  village: string
  latitude: number
  longitude: number
  imageUrl: string
  thumbnailUrl: string
  uploadedAt: string
  uploadedBy: string
  verificationStatus: "VERIFIED" | "PENDING" | "REJECTED"
}

export interface EvidencePayload {
  title: string
  description?: string
  category: string
  watershedId: string
  interventionId?: string | null
  district: string
  block: string
  village: string
  latitude: number
  longitude: number
  date: string
  uploadedBy: string
  verificationStatus: "VERIFIED" | "PENDING" | "REJECTED"
  imageUrl: string
  thumbnailUrl?: string
}

export function getStorageBucketName(): string {
  const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET
  return typeof bucket === "string" && bucket.trim() ? bucket.trim() : "geo-photos"
}

export async function uploadEvidenceImage(file: File): Promise<{ publicUrl: string; storagePath: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error("Supabase is not configured.")
  }

  const bucket = getStorageBucketName()
  const timestamp = Date.now()
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
  const path = `evidence/${timestamp}_${cleanName}`

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  })

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return {
    publicUrl: publicUrlData.publicUrl,
    storagePath: data.path
  }
}

export async function fetchEvidenceList(): Promise<EvidenceRecord[]> {
  if (isApiConfigured()) {
    try {
      const data = await apiRequest<EvidenceRecord[]>("/map/evidence")
      if (Array.isArray(data)) return data
    } catch {
      // API unavailable
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("evidence")
        .select("*")
        .order("created_at", { ascending: false })
      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.title ?? "Field Photo",
          description: d.description,
          category: d.category ?? "Water Structure",
          watershedId: d.watershed_id,
          interventionId: d.intervention_id,
          district: d.district ?? "",
          block: d.block ?? "",
          village: d.village ?? "",
          latitude: Number(d.latitude ?? 0),
          longitude: Number(d.longitude ?? 0),
          imageUrl: d.image_url ?? d.storage_path,
          thumbnailUrl: d.thumbnail_url ?? d.image_url ?? d.storage_path,
          uploadedAt: d.created_at ?? new Date().toISOString(),
          uploadedBy: d.uploaded_by ?? "",
          verificationStatus: d.verification_status ?? "PENDING"
        }))
      }
    } catch {
      // Supabase query error
    }
  }

  return []
}

export async function submitEvidenceRecord(payload: EvidencePayload): Promise<{ success: boolean; id?: string }> {
  if (isApiConfigured()) {
    try {
      const response = await apiRequest<{ id: string }>("/evidence", {
        method: "POST",
        body: JSON.stringify(payload)
      })
      return { success: true, id: response.id }
    } catch (err) {
      console.warn("API POST /evidence failed:", err)
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    const { data, error } = await supabase.from("evidence").insert({
      title: payload.title,
      description: payload.description,
      category: payload.category,
      watershed_id: payload.watershedId,
      intervention_id: payload.interventionId,
      district: payload.district,
      block: payload.block,
      village: payload.village,
      latitude: payload.latitude,
      longitude: payload.longitude,
      image_url: payload.imageUrl,
      uploaded_by: payload.uploadedBy,
      verification_status: payload.verificationStatus,
    }).select("id").single()

    if (!error && data) {
      return { success: true, id: data.id }
    }
    throw new Error(error ? error.message : "Failed to record evidence in Supabase.")
  }

  throw new Error("Neither API nor Supabase is configured to save evidence.")
}
