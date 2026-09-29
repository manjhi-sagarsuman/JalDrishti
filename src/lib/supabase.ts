import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// Standardize on VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, with fallback to VITE_SUPABASE_ANON_KEY
export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/^["']|["']$/g, "")
export const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  ""
).trim().replace(/^["']|["']$/g, "")

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

let supabaseClient: SupabaseClient | undefined

function validateConfiguration() {
  const missingVariables = [
    !supabaseUrl && "VITE_SUPABASE_URL",
    !supabasePublishableKey && "VITE_SUPABASE_PUBLISHABLE_KEY",
  ].filter((variable): variable is string => Boolean(variable))

  if (missingVariables.length > 0) {
    throw new Error(`Supabase is not configured. Set ${missingVariables.join(" and ")} in your local .env file.`)
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(supabaseUrl)
  } catch {
    throw new Error("VITE_SUPABASE_URL must be a valid absolute URL.")
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("VITE_SUPABASE_URL must use HTTPS (HTTP is allowed for local development).")
  }
}

/** Creates the browser client on demand so the app can run without Supabase credentials. */
export function getSupabaseClient(): SupabaseClient {
  validateConfiguration()
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        persistSession: true,
      },
    })
  }
  return supabaseClient
}

export interface SupabaseConnectionResult {
  connected: boolean
  status?: number
  message: string
}

/** Performs a read-only GET against Supabase Auth health; it does not query or modify application tables. */
export async function checkSupabaseConnection(): Promise<SupabaseConnectionResult> {
  try {
    getSupabaseClient()
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: supabasePublishableKey },
      signal: AbortSignal.timeout(8000),
    })

    return response.ok
      ? { connected: true, status: response.status, message: "Supabase Auth endpoint is reachable." }
      : { connected: false, status: response.status, message: "Supabase responded, but its Auth health check was not successful." }
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : "Unable to reach the Supabase endpoint.",
    }
  }
}
