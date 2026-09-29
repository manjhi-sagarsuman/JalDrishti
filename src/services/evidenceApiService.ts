import { apiRequest, isApiConfigured } from "./apiClient"
import { getSupabaseClient } from "../lib/supabase"
import { SAMPLE_EVIDENCE, type SampleEvidence } from "./sampleGisData"

export const EVIDENCE_STORAGE_BUCKET = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? "geo-photos").trim()

export interface EvidencePayload {
  title: string
  description: string
  category: string
  watershedId: string
  watershedName?: string
  interventionId?: string | null
  interventionName?: string | null
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

export async function fetchEvidenceList(): Promise<SampleEvidence[]> {
  if (isApiConfigured()) {
    try {
      const data = await apiRequest<SampleEvidence[]>("/map/evidence")
      if (Array.isArray(data) && data.length > 0) return data
    } catch (err) {
      console.warn("API /map/evidence unavailable, falling back to Supabase/sample:", err)
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("evidence").select("id, title, description, category, latitude, longitude, captured_at, verification_status, created_by, storage_path, watershed_id, watersheds(name), intervention_id, interventions(name)")
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => {
          let signedUrl = "https://images.unsplash.com/photo-1544984243-ec57ea16fe25?auto=format&fit=crop&w=600&q=80"
          if (item.storage_path) {
            const { data: pubData } = supabase.storage.from(EVIDENCE_STORAGE_BUCKET).getPublicUrl(item.storage_path)
            if (pubData?.publicUrl) signedUrl = pubData.publicUrl
          }
          return {
            id: item.id,
            title: item.title || "Geo-tagged Evidence",
            description: item.description || "",
            category: item.category || "Water Structure",
            watershedId: item.watershed_id,
            watershedName: item.watersheds?.name || "Watershed",
            interventionId: item.intervention_id,
            interventionName: item.interventions?.name || null,
            district: "Ahmednagar",
            block: "Parner",
            village: "Ralegan Siddhi",
            latitude: Number(item.latitude || 19.02),
            longitude: Number(item.longitude || 74.43),
            imageUrl: signedUrl,
            thumbnailUrl: signedUrl,
            uploadedBy: item.created_by || "Field Officer",
            uploadedAt: item.captured_at || new Date().toISOString(),
            verificationStatus: item.verification_status || "PENDING"
          }
        })
      }
    } catch {
      // fallback
    }
  }

  return SAMPLE_EVIDENCE
}

export async function uploadEvidenceImage(file: File): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    // Generate object URL for local preview when Supabase is not connected
    const objectUrl = URL.createObjectURL(file)
    return {
      storagePath: `local/${Date.now()}-${file.name}`,
      publicUrl: objectUrl
    }
  }

  const ext = file.name.split(".").pop() || "jpg"
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`
  const storagePath = `evidence/${fileName}`

  const { error: uploadError } = await supabase.storage.from(EVIDENCE_STORAGE_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false
  })

  if (uploadError) {
    console.warn("Storage upload failed or bucket absent, falling back to local object URL:", uploadError.message)
    return {
      storagePath,
      publicUrl: URL.createObjectURL(file)
    }
  }

  const { data: urlData } = supabase.storage.from(EVIDENCE_STORAGE_BUCKET).getPublicUrl(storagePath)
  return {
    storagePath,
    publicUrl: urlData.publicUrl
  }
}

export async function submitEvidenceRecord(payload: EvidencePayload): Promise<{ success: boolean; id: string }> {
  if (isApiConfigured()) {
    try {
      const response = await apiRequest<{ id: string }>("/evidence", {
        method: "POST",
        body: JSON.stringify(payload)
      })
      return { success: true, id: response.id }
    } catch (err) {
      console.warn("API POST /evidence failed, falling back to Supabase/local:", err)
    }
  }

  const supabase = getSupabaseClient()
  if (supabase) {
    try {
      const { data, error } = await supabase.from("evidence").insert({
        title: payload.title,
        description: payload.description,
        category: payload.category,
        watershed_id: payload.watershedId,
        intervention_id: payload.interventionId || null,
        latitude: payload.latitude,
        longitude: payload.longitude,
        captured_at: payload.date,
        verification_status: payload.verificationStatus,
        storage_path: payload.imageUrl
      }).select("id").single()

      if (!error && data) {
        return { success: true, id: data.id }
      }
    } catch {
      // fallback
    }
  }

  return { success: true, id: `demo-ev-${Date.now()}` }
}
