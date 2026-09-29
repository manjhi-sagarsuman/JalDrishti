import type { MapFeatureCollection } from "../maps"
import { getSupabaseClient } from "../lib/supabase"
import { GEO_PHOTOS_BUCKET } from "./evidenceService"

export const interventionTypes = [
  "Water Conservation Structure",
  "Check Dam",
  "Farm Pond",
  "Contour Bund",
  "Drainage Treatment",
  "Plantation",
  "Soil Conservation",
  "Other",
] as const

export type InterventionStatus = "PLANNED" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
export type InterventionTypeName = (typeof interventionTypes)[number]

export interface InterventionEvidence {
  id: string
  fileName: string
  signedUrl: string | null
  capturedAt: string | null
  verificationStatus: string
  stage: "BEFORE" | "AFTER" | null
}

export interface InterventionObservation {
  id: string
  label: string
  value: number | null
  unit: string | null
  observedAt: string | null
  source: "Satellite observation" | "Indicator" | "Change analysis"
  summary: string | null
}

export interface InterventionWatershed {
  id: string
  code: string
  name: string
}

export interface InterventionTypeOption {
  id: string
  name: string
}

export interface InterventionRecord {
  id: string
  code: string | null
  name: string
  typeId: string
  type: InterventionTypeName
  watershedId: string
  watershedName: string
  watershedCode: string
  location: unknown
  status: InterventionStatus
  description: string | null
  implementingAgency: string | null
  plannedStart: string | null
  actualStart: string | null
  actualEnd: string | null
  createdAt: string
  updatedAt: string
  createdBy: string | null
  evidence: InterventionEvidence[]
  observations: InterventionObservation[]
}

export interface InterventionDirectory {
  records: InterventionRecord[]
  watersheds: InterventionWatershed[]
  types: InterventionTypeOption[]
  mapFeatures: MapFeatureCollection
}

export interface NewIntervention {
  watershedId: string
  typeId: string
  name: string
  latitude: number
  longitude: number
  implementationDate: string
  status: InterventionStatus
  description: string
  implementingAgency: string
  userId: string
}

interface RawIntervention {
  id: string
  code: string | null
  name: string
  watershed_id: string
  intervention_type_id: string
  description: string | null
  status: InterventionStatus
  location: unknown
  planned_start: string | null
  actual_start: string | null
  actual_end: string | null
  metadata: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  updated_at: string
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null
}

function parsePoint(value: unknown): [number, number] | null {
  const object = asObject(value)
  if (object?.type === "Point" && Array.isArray(object.coordinates)) {
    const [longitude, latitude] = object.coordinates
    return typeof longitude === "number" && typeof latitude === "number" ? [longitude, latitude] : null
  }
  if (typeof value === "string") {
    const match = value.match(/(?:SRID=\d+;)?POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i)
    if (match) return [Number(match[1]), Number(match[2])]
  }
  return null
}

function parseFeatureCollection(value: unknown): MapFeatureCollection | null {
  const object = asObject(value)
  return object?.type === "FeatureCollection" && Array.isArray(object.features) ? value as MapFeatureCollection : null
}

function observationCodeLabel(value: unknown, fallback: string) {
  const code = typeof value === "string" ? value : fallback
  return code.replaceAll("_", " ").toUpperCase()
}

export async function loadInterventionDirectory(): Promise<InterventionDirectory> {
  const client = getSupabaseClient()
  const [interventionsResult, watershedsResult, typesResult, photosResult, satelliteResult, indicatorsResult, changesResult, mapResult] = await Promise.all([
    client.from("interventions").select("id, code, name, watershed_id, intervention_type_id, description, status, location, planned_start, actual_start, actual_end, metadata, created_by, created_at, updated_at").order("created_at", { ascending: false }).limit(1000),
    client.from("watersheds").select("id, code, name").order("name").limit(1000),
    client.from("intervention_types").select("id, name").eq("status", "ACTIVE").order("name"),
    client.from("geo_photos").select("id, intervention_id, storage_path, file_name, captured_at, verification_status, metadata").not("intervention_id", "is", null).order("captured_at", { ascending: false }).limit(2000),
    client.from("satellite_observations").select("id, watershed_id, observation_code, observed_at, statistic, value, unit").order("observed_at", { ascending: false }).limit(3000),
    client.from("indicators").select("id, watershed_id, indicator_code, name, observed_at, value, unit").order("observed_at", { ascending: false }).limit(3000),
    client.from("change_analysis").select("id, watershed_id, summary, observed_change, created_at, status").order("created_at", { ascending: false }).limit(2000),
    client.rpc("get_intervention_feature_collection"),
  ])
  if (interventionsResult.error) throw new Error("Interventions could not be loaded. Check the database migrations and watershed access permissions.")
  if (watershedsResult.error) throw new Error("Watershed options could not be loaded. Check the database migration and access permissions.")
  if (typesResult.error) throw new Error("Intervention type options could not be loaded. Apply the intervention reference migration.")
  if (photosResult.error) throw new Error("Linked field evidence could not be loaded. Check the evidence migration and access permissions.")
  if (satelliteResult.error || indicatorsResult.error || changesResult.error) throw new Error("Associated satellite observations could not be loaded. Check the monitoring schema and watershed access permissions.")

  const watersheds = (watershedsResult.data ?? []).map((row) => ({ id: String(row.id), code: String(row.code), name: String(row.name) }))
  const watershedById = new Map(watersheds.map((watershed) => [watershed.id, watershed]))
  const typeById = new Map((typesResult.data ?? []).map((row) => [String(row.id), String(row.name)]))
  const rawRecords = (interventionsResult.data ?? []) as unknown as RawIntervention[]
  const rawPhotos = photosResult.data ?? []
  const signedUrlsResult = rawPhotos.length
    ? await client.storage.from(GEO_PHOTOS_BUCKET).createSignedUrls(rawPhotos.map((photo) => String(photo.storage_path)), 3600)
    : { data: [], error: null }
  const signedUrlByPath = new Map((signedUrlsResult.data ?? []).map((item) => [item.path, item.signedUrl]))
  const evidenceByIntervention = new Map<string, InterventionEvidence[]>()
  for (const photo of rawPhotos) {
    const id = String(photo.intervention_id)
    const metadata = asObject(photo.metadata)
    const stage = metadata?.evidence_stage ?? metadata?.stage
    const evidence: InterventionEvidence = {
      id: String(photo.id),
      fileName: String(photo.file_name),
      signedUrl: signedUrlByPath.get(String(photo.storage_path)) ?? null,
      capturedAt: typeof photo.captured_at === "string" ? photo.captured_at : null,
      verificationStatus: String(photo.verification_status),
      stage: stage === "BEFORE" || stage === "AFTER" ? stage : null,
    }
    evidenceByIntervention.set(id, [...(evidenceByIntervention.get(id) ?? []), evidence])
  }

  const observationsByWatershed = new Map<string, InterventionObservation[]>()
  for (const row of satelliteResult.data ?? []) {
    const id = String(row.watershed_id)
    const value = row.value === null ? null : Number(row.value)
    const observation: InterventionObservation = {
      id: String(row.id), label: observationCodeLabel(row.observation_code, String(row.statistic)),
      value: Number.isFinite(value) ? value : null, unit: typeof row.unit === "string" ? row.unit : null,
      observedAt: typeof row.observed_at === "string" ? row.observed_at : null, source: "Satellite observation", summary: null,
    }
    observationsByWatershed.set(id, [...(observationsByWatershed.get(id) ?? []), observation])
  }
  for (const row of indicatorsResult.data ?? []) {
    const id = String(row.watershed_id)
    const value = row.value === null ? null : Number(row.value)
    const observation: InterventionObservation = {
      id: String(row.id), label: String(row.name || observationCodeLabel(row.indicator_code, "Indicator")),
      value: Number.isFinite(value) ? value : null, unit: typeof row.unit === "string" ? row.unit : null,
      observedAt: typeof row.observed_at === "string" ? row.observed_at : null, source: "Indicator", summary: null,
    }
    observationsByWatershed.set(id, [...(observationsByWatershed.get(id) ?? []), observation])
  }
  for (const row of changesResult.data ?? []) {
    if (row.status !== "COMPLETED" && row.status !== "REVIEWED") continue
    const id = String(row.watershed_id)
    observationsByWatershed.set(id, [...(observationsByWatershed.get(id) ?? []), {
      id: String(row.id), label: "Observed change", value: null, unit: null,
      observedAt: typeof row.created_at === "string" ? row.created_at : null, source: "Change analysis",
      summary: typeof row.summary === "string" ? row.summary : row.observed_change === null ? null : `Observed change value: ${String(row.observed_change)}`,
    }])
  }

  const records = rawRecords.map((record): InterventionRecord => {
    const watershed = watershedById.get(record.watershed_id)
    const rawType = typeById.get(record.intervention_type_id)
    const type = interventionTypes.includes(rawType as InterventionTypeName) ? rawType as InterventionTypeName : "Other"
    const metadata = record.metadata ?? {}
    return {
      id: record.id, code: record.code, name: record.name, typeId: record.intervention_type_id, type,
      watershedId: record.watershed_id, watershedName: watershed?.name ?? "Watershed unavailable", watershedCode: watershed?.code ?? "—",
      location: record.location, status: record.status, description: record.description,
      implementingAgency: typeof metadata.implementing_agency === "string" ? metadata.implementing_agency : null,
      plannedStart: record.planned_start, actualStart: record.actual_start, actualEnd: record.actual_end,
      createdAt: record.created_at, updatedAt: record.updated_at, createdBy: record.created_by,
      evidence: evidenceByIntervention.get(record.id) ?? [],
      observations: observationsByWatershed.get(record.watershed_id) ?? [],
    }
  })
  const mapFeatures = parseFeatureCollection(mapResult.data) ?? {
    type: "FeatureCollection",
    features: rawRecords.flatMap((record) => {
      const point = parsePoint(record.location)
      return point ? [{ type: "Feature" as const, id: record.id, geometry: { type: "Point" as const, coordinates: point }, properties: { layerId: "interventions", title: record.name, intervention_id: record.id, watershed_id: record.watershed_id, status: record.status } }] : []
    }),
  }
  const types = (typesResult.data ?? []).map((row) => ({ id: String(row.id), name: String(row.name) }))
  return { records, watersheds, types, mapFeatures }
}

export async function createIntervention(input: NewIntervention): Promise<string> {
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) throw new Error("Latitude must be between -90 and 90 degrees.")
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) throw new Error("Longitude must be between -180 and 180 degrees.")
  if (!input.implementationDate || Number.isNaN(Date.parse(input.implementationDate))) throw new Error("Enter a valid implementation date.")
  const client = getSupabaseClient()
  const identifier = crypto.randomUUID()
  const actual = input.status === "IN_PROGRESS" || input.status === "COMPLETED"
  const result = await client.from("interventions").insert({
    id: identifier,
    watershed_id: input.watershedId,
    intervention_type_id: input.typeId,
    code: `INT-${identifier.slice(0, 8).toUpperCase()}`,
    name: input.name.trim(),
    description: input.description.trim() || null,
    status: input.status,
    location: `SRID=4326;POINT(${input.longitude} ${input.latitude})`,
    planned_start: input.implementationDate,
    actual_start: actual ? input.implementationDate : null,
    created_by: input.userId,
    metadata: { implementing_agency: input.implementingAgency.trim() || null },
  }).select("id").single()
  if (result.error) throw new Error("Intervention could not be saved. Check your role, watershed scope, and required database migrations.")
  return String(result.data.id)
}
