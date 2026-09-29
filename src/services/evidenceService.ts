import type { MapFeatureCollection } from "../maps"
import { getSupabaseClient, supabaseStorageBucket } from "../lib/supabase"

export const GEO_PHOTOS_BUCKET = supabaseStorageBucket
export const MAX_EVIDENCE_IMAGE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_EVIDENCE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export const observationTypes = ["Water Structure", "Vegetation", "Drainage", "Agricultural Area", "Soil", "Other"] as const
export type ObservationType = (typeof observationTypes)[number]
export type EvidenceVerificationStatus = "VERIFIED" | "PENDING" | "REJECTED"
export type GpsValidationStatus = "PENDING" | "VALID" | "MISSING" | "INVALID"

export interface EvidenceRecord {
  id: string
  watershedId: string
  watershedName: string
  interventionId: string | null
  interventionName: string | null
  fileName: string
  mimeType: string
  fileSizeBytes: number | null
  storagePath: string
  signedUrl: string | null
  longitude: number | null
  latitude: number | null
  capturedAt: string | null
  description: string | null
  observationType: ObservationType
  gpsValidation: GpsValidationStatus
  verificationStatus: EvidenceVerificationStatus
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface EvidenceWatershedOption {
  id: string
  code: string
  name: string
}

export interface EvidenceInterventionOption {
  id: string
  watershedId: string
  name: string
  code: string | null
}

export interface EvidenceDirectory {
  records: EvidenceRecord[]
  watersheds: EvidenceWatershedOption[]
  interventions: EvidenceInterventionOption[]
  mapFeatures: MapFeatureCollection
}

export interface NewEvidenceMetadata {
  watershedId: string
  interventionId: string | null
  longitude: number
  latitude: number
  capturedDate: string
  description: string
  observationType: ObservationType
}

interface RawEvidenceRecord {
  id: string
  watershed_id: string
  intervention_id: string | null
  storage_path: string
  file_name: string
  mime_type: string
  file_size_bytes: number | string | null
  location: unknown
  captured_at: string | null
  gps_validation: GpsValidationStatus
  verification_status: EvidenceVerificationStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  metadata: Record<string, unknown> | null
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null
}

function parsePoint(value: unknown): [number, number] | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    try {
      const parsed = JSON.parse(trimmed) as unknown
      const point = parsePoint(parsed)
      if (point) return point
    } catch {
      const match = trimmed.match(/(?:SRID=\d+;)?POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i)
      if (match) {
        const longitude = Number(match[1])
        const latitude = Number(match[2])
        if (Number.isFinite(longitude) && Number.isFinite(latitude)) return [longitude, latitude]
      }
    }
    return null
  }
  const object = asObject(value)
  if (!object || object.type !== "Point" || !Array.isArray(object.coordinates)) return null
  const [longitude, latitude] = object.coordinates
  return typeof longitude === "number" && typeof latitude === "number" ? [longitude, latitude] : null
}

function parseFeatureCollection(value: unknown): MapFeatureCollection | null {
  const object = asObject(value)
  if (object?.type !== "FeatureCollection" || !Array.isArray(object.features)) return null
  return value as MapFeatureCollection
}

export async function loadEvidenceDirectory(): Promise<EvidenceDirectory> {
  const client = getSupabaseClient()
  const [photosResult, watershedsResult, interventionsResult] = await Promise.all([
    client.from("geo_photos")
      .select("id, watershed_id, intervention_id, storage_path, file_name, mime_type, file_size_bytes, location, captured_at, gps_validation, verification_status, notes, created_by, created_at, updated_at, metadata")
      .order("created_at", { ascending: false })
      .limit(250),
    client.from("watersheds").select("id, code, name").order("name").limit(500),
    client.from("interventions").select("id, watershed_id, code, name").order("name").limit(1000),
  ])

  if (photosResult.error) throw new Error("Evidence records could not be loaded. Check the database migration and access permissions.")
  if (watershedsResult.error) throw new Error("Watershed options could not be loaded. Check the database migration and access permissions.")
  if (interventionsResult.error) throw new Error("Intervention options could not be loaded. Check the database migration and access permissions.")

  const watersheds = (watershedsResult.data ?? []).map((row) => ({
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
  }))
  const interventions = (interventionsResult.data ?? []).map((row) => ({
    id: String(row.id),
    watershedId: String(row.watershed_id),
    name: String(row.name),
    code: typeof row.code === "string" ? row.code : null,
  }))

  const rawRecords = (photosResult.data ?? []) as unknown as RawEvidenceRecord[]
  const signedUrls = rawRecords.length > 0
    ? await client.storage.from(GEO_PHOTOS_BUCKET).createSignedUrls(rawRecords.map((record) => record.storage_path), 3600)
    : { data: [], error: null }
  const signedUrlByPath = new Map((signedUrls.data ?? []).map((item) => [item.path, item.signedUrl]))

  const mapResult = await client.rpc("get_geo_photo_feature_collection")
  const parsedMapFeatures = parseFeatureCollection(mapResult.data)
  const mapFeatures: MapFeatureCollection = parsedMapFeatures ?? {
      type: "FeatureCollection",
      features: rawRecords.flatMap((record) => {
        const point = parsePoint(record.location)
        return point ? [{
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: point },
          properties: { layerId: "geo-tagged-photos", title: record.file_name, image_id: record.id, watershed_id: record.watershed_id, verification_status: record.verification_status },
        }] : []
      }),
    }

  const watershedNameById = new Map(watersheds.map((watershed) => [watershed.id, watershed.name]))
  const interventionNameById = new Map(interventions.map((intervention) => [intervention.id, intervention.name]))
  const records: EvidenceRecord[] = rawRecords.map((record) => {
    const point = parsePoint(record.location)
    const metadata = record.metadata ?? {}
    const observationType = observationTypes.includes(metadata.observation_type as ObservationType)
      ? metadata.observation_type as ObservationType
      : "Other"

    return {
      id: record.id,
      watershedId: record.watershed_id,
      watershedName: watershedNameById.get(record.watershed_id) ?? "Watershed unavailable",
      interventionId: record.intervention_id,
      interventionName: record.intervention_id ? interventionNameById.get(record.intervention_id) ?? "Intervention unavailable" : null,
      fileName: record.file_name,
      mimeType: record.mime_type,
      fileSizeBytes: record.file_size_bytes === null ? null : Number(record.file_size_bytes),
      storagePath: record.storage_path,
      signedUrl: signedUrlByPath.get(record.storage_path) ?? null,
      longitude: point?.[0] ?? null,
      latitude: point?.[1] ?? null,
      capturedAt: record.captured_at,
      description: record.notes,
      observationType,
      gpsValidation: record.gps_validation,
      verificationStatus: record.verification_status,
      createdBy: record.created_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }
  })

  return { records, watersheds, interventions, mapFeatures }
}

export async function uploadEvidence(file: File, metadata: NewEvidenceMetadata, userId: string): Promise<string> {
  if (!(ACCEPTED_EVIDENCE_MIME_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("Choose a JPEG, PNG, or WebP image.")
  }
  if (file.size <= 0 || file.size > MAX_EVIDENCE_IMAGE_BYTES) {
    throw new Error("Image must be smaller than 10 MB.")
  }
  if (!Number.isFinite(metadata.latitude) || metadata.latitude < -90 || metadata.latitude > 90) {
    throw new Error("Latitude must be between -90 and 90 degrees.")
  }
  if (!Number.isFinite(metadata.longitude) || metadata.longitude < -180 || metadata.longitude > 180) {
    throw new Error("Longitude must be between -180 and 180 degrees.")
  }
  if (!metadata.capturedDate || Number.isNaN(Date.parse(metadata.capturedDate))) {
    throw new Error("Enter a valid capture date.")
  }

  const client = getSupabaseClient()
  const imageId = crypto.randomUUID()
  const extensionByMimeType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
  const storagePath = `${userId}/${imageId}.${extensionByMimeType[file.type]}`
  const uploadResult = await client.storage.from(GEO_PHOTOS_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  })
  if (uploadResult.error) throw new Error("Image upload failed. Verify the private geo-photos bucket and upload permissions.")

  const insertResult = await client.from("geo_photos").insert({
    id: imageId,
    watershed_id: metadata.watershedId,
    intervention_id: metadata.interventionId,
    storage_path: storagePath,
    file_name: file.name.slice(0, 255),
    mime_type: file.type,
    file_size_bytes: file.size,
    location: `SRID=4326;POINT(${metadata.longitude} ${metadata.latitude})`,
    captured_at: `${metadata.capturedDate}T00:00:00.000Z`,
    gps_validation: "PENDING",
    verification_status: "PENDING",
    notes: metadata.description.trim() || null,
    metadata: { observation_type: metadata.observationType },
    created_by: userId,
  })

  if (insertResult.error) {
    await client.storage.from(GEO_PHOTOS_BUCKET).remove([storagePath])
    throw new Error("Image was uploaded, but its evidence record could not be saved. Check watershed access and database permissions.")
  }
  return imageId
}
