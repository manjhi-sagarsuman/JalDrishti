export type EvidenceVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED"

export interface EvidenceRecord {
  id: string
  title: string
  description?: string
  category: string
  watershedId?: string
  watershedName?: string
  interventionId?: string
  interventionName?: string
  district?: string
  block?: string
  village?: string
  latitude: number
  longitude: number
  capturedAt?: string
  uploadedBy?: string
  verificationStatus: EvidenceVerificationStatus
  storagePath?: string
  imageUrl?: string
  thumbnailUrl?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

export interface CreateEvidenceInput {
  title: string
  description?: string
  category: string
  watershedId?: string
  interventionId?: string
  district?: string
  block?: string
  village?: string
  latitude: number
  longitude: number
  capturedAt?: string
  file: File
}

export function validateCoordinates(latitude: number, longitude: number): { valid: boolean; error?: string } {
  if (typeof latitude !== "number" || typeof longitude !== "number" || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return { valid: false, error: "Latitude and longitude must be valid decimal numbers." }
  }
  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: "Latitude must be between -90 and +90 degrees." }
  }
  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: "Longitude must be between -180 and +180 degrees." }
  }
  return { valid: true }
}
