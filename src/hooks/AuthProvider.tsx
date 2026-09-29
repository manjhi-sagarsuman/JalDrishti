import { useCallback, useEffect, useState, type ReactNode } from "react"
import type { Session, SupabaseClient } from "@supabase/supabase-js"
import { AuthContext } from "./authContext"
import { appRoles, type AppRole, type UserProfile } from "./authTypes"
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabase"

function getInitialConfigurationError() {
  if (!isSupabaseConfigured) return "Supabase is not configured. Add the project URL and publishable key to your local .env file."
  try {
    const url = new URL(import.meta.env.VITE_SUPABASE_URL?.trim() ?? "")
    if (url.protocol === "https:" || url.protocol === "http:") return null
  } catch {
    // Invalid URLs are reported as configuration errors below.
  }
  return "Supabase configuration is invalid. Check the local environment variables."
}

const initialConfigurationError = getInitialConfigurationError()

interface AuthProviderProps {
  children: ReactNode
}

function parseProfile(value: unknown): UserProfile | null {
  if (typeof value !== "object" || value === null) return null
  const row = value as Record<string, unknown>
  if (typeof row.user_id !== "string" || !appRoles.includes(row.role as AppRole) || row.status !== "ACTIVE") return null
  return {
    userId: row.user_id,
    displayName: typeof row.display_name === "string" ? row.display_name : null,
    role: row.role as AppRole,
  }
}

async function loadProfile(client: SupabaseClient, userId: string): Promise<UserProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("user_id, display_name, role, status")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return parseProfile(data as unknown)
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(initialConfigurationError === null)
  const [profileStatus, setProfileStatus] = useState<"loading" | "ready" | "error">("loading")
  const [profileError, setProfileError] = useState<string | null>(null)
  const [configurationError] = useState<string | null>(initialConfigurationError)

  useEffect(() => {
    if (initialConfigurationError) {
      return
    }

    let active = true
    let activeUserId: string | null = null
    let client: SupabaseClient

    try {
      client = getSupabaseClient()
    } catch {
      return
    }

    async function resolveProfile(userId: string) {
      try {
        const loadedProfile = await loadProfile(client, userId)
        if (!active || activeUserId !== userId) return
        setProfile(loadedProfile)
        setProfileStatus("ready")
        setProfileError(null)
      } catch {
        if (!active || activeUserId !== userId) return
        setProfile(null)
        setProfileStatus("error")
        setProfileError("We could not verify your application role. Contact an administrator.")
      } finally {
        if (active && activeUserId === userId) setLoading(false)
      }
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      activeUserId = nextSession?.user.id ?? null
      setSession(nextSession)
      setProfile(null)
      setProfileError(null)

      if (!nextSession) {
        setProfileStatus("ready")
        setLoading(false)
        return
      }

      setProfileStatus("loading")
      setLoading(true)
      const userId = nextSession.user.id
      window.setTimeout(() => {
        if (active && activeUserId === userId) void resolveProfile(userId)
      }, 0)
    })

    return () => {
      active = false
      activeUserId = null
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const client = getSupabaseClient()
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error("Sign in failed. Check your credentials or contact an administrator.")
  }, [])

  const signOut = useCallback(async () => {
    const client = getSupabaseClient()
    const { error } = await client.auth.signOut()
    if (error) throw new Error("Sign out could not be completed. Please try again.")
  }, [])

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      loading,
      profileStatus,
      profileError,
      configurationError,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
