import { getSupabaseClient } from "../lib/supabase"
import { loadAnalyticsWorkspace, type AnalyticsWorkspace } from "./analyticsService"
import { loadEvidenceDirectory, type EvidenceDirectory } from "./evidenceService"

export interface InsightDocumentReference {
  id: string
  code: string
  name: string
  organization: string | null
  description: string | null
  url: string | null
  license: string | null
}

export interface InsightWorkspace {
  analytics: AnalyticsWorkspace
  evidence: EvidenceDirectory
  documents: InsightDocumentReference[]
}

export async function loadInsightWorkspace(): Promise<InsightWorkspace> {
  const client = getSupabaseClient()
  const [analytics, evidence, documentsResult] = await Promise.all([
    loadAnalyticsWorkspace(),
    loadEvidenceDirectory(),
    client.from("data_sources").select("id, code, name, organization, description, source_url, license").eq("status", "ACTIVE").order("name").limit(500),
  ])
  if (documentsResult.error) throw new Error("Source and document references could not be loaded. Check data-source access permissions.")
  const documents = (documentsResult.data ?? []).map((row): InsightDocumentReference => ({
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    organization: typeof row.organization === "string" ? row.organization : null,
    description: typeof row.description === "string" ? row.description : null,
    url: typeof row.source_url === "string" ? row.source_url : null,
    license: typeof row.license === "string" ? row.license : null,
  }))
  return { analytics, evidence, documents }
}
