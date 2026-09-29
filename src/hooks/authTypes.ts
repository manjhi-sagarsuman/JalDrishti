import type { Session } from "@supabase/supabase-js"

export const appRoles = ["ADMIN", "STATE_OFFICER", "DISTRICT_OFFICER", "FIELD_OFFICER", "GIS_ANALYST"] as const

export type AppRole = (typeof appRoles)[number]

export interface UserProfile {
  userId: string
  displayName: string | null
  role: AppRole
}

export type ProfileStatus = "loading" | "ready" | "error"

export interface AuthContextValue {
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  profileStatus: ProfileStatus
  profileError: string | null
  configurationError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}
