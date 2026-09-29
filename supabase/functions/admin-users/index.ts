/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const roles = ["ADMIN", "STATE_OFFICER", "DISTRICT_OFFICER", "FIELD_OFFICER", "GIS_ANALYST"] as const
type Role = (typeof roles)[number]
interface RoleScope { state_id: string | null; district_id: string | null; block_id: string | null; village_id: string | null }

function isValidScope(role: Role, scope: RoleScope) {
  if (role === "ADMIN" || role === "GIS_ANALYST") return true
  if (!scope.state_id) return false
  if (role === "STATE_OFFICER") return !scope.district_id && !scope.block_id && !scope.village_id
  if (!scope.district_id) return false
  if (role === "DISTRICT_OFFICER") return !scope.block_id && !scope.village_id
  return Boolean(scope.block_id && scope.village_id)
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405)

  const url = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!url || !anonKey || !serviceKey) return response({ error: "User administration is not configured on the server." }, 500)
  const authorization = request.headers.get("Authorization")
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return response({ error: "Authentication required." }, 401)

  const callerClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } })
  const { data: { user: caller }, error: userError } = await callerClient.auth.getUser(token)
  if (userError || !caller) return response({ error: "Session could not be verified." }, 401)
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: callerProfile, error: callerProfileError } = await admin.from("profiles").select("role, status").eq("user_id", caller.id).maybeSingle()
  if (callerProfileError) return response({ error: "Admin role could not be verified." }, 500)
  if (callerProfile?.role !== "ADMIN" || callerProfile.status !== "ACTIVE") return response({ error: "Only an active Admin may manage users." }, 403)

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    if (typeof parsed !== "object" || parsed === null) return response({ error: "Invalid request body." }, 400)
    body = parsed as Record<string, unknown>
  } catch { return response({ error: "Invalid JSON request body." }, 400) }

  if (body.action === "list") {
    const authUsers = []
    for (let page = 1; page <= 100; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) return response({ error: "Auth user directory could not be loaded." }, 502)
      authUsers.push(...data.users)
      if (data.users.length < 1000) break
    }
    const ids = authUsers.map((entry) => entry.id)
    const profileRows = ids.length ? await admin.from("profiles").select("user_id, display_name, role, status, metadata, state_id, district_id, block_id, village_id, updated_at").in("user_id", ids).limit(100000) : { data: [], error: null }
    if (profileRows.error) return response({ error: "User role profiles could not be loaded." }, 502)
    const profiles = new Map((profileRows.data ?? []).map((row) => [String(row.user_id), row]))
    const users = authUsers.map((entry) => {
      const profile = profiles.get(entry.id)
      const metadata = typeof profile?.metadata === "object" && profile.metadata !== null ? profile.metadata as Record<string, unknown> : {}
      return { userId: entry.id, name: profile?.display_name ?? entry.user_metadata?.display_name ?? null, email: entry.email ?? null, role: profile?.role ?? null, organization: typeof metadata.organization === "string" ? metadata.organization : null, status: profile?.status ?? "UNASSIGNED", lastLogin: entry.last_sign_in_at ?? null, stateId: profile?.state_id ?? null, districtId: profile?.district_id ?? null, blockId: profile?.block_id ?? null, villageId: profile?.village_id ?? null }
    })
    return response({ users })
  }

  if (body.action === "invite") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const organization = typeof body.organization === "string" ? body.organization.trim() : ""
    const role = body.role
    const scope = { state_id: typeof body.stateId === "string" ? body.stateId : null, district_id: typeof body.districtId === "string" ? body.districtId : null, block_id: typeof body.blockId === "string" ? body.blockId : null, village_id: typeof body.villageId === "string" ? body.villageId : null }
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !name || !roles.includes(role as Role)) return response({ error: "Provide a valid email, name, and supported role." }, 400)
    if (!isValidScope(role as Role, scope)) return response({ error: "Assign the required administrative area for this officer role." }, 400)
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { display_name: name } })
    if (inviteError || !invited.user) return response({ error: inviteError?.message ?? "Auth invitation was not created." }, 422)
    const { error: profileError } = await admin.from("profiles").upsert({ user_id: invited.user.id, display_name: name, role, status: "ACTIVE", metadata: { organization }, ...scope }, { onConflict: "user_id" })
    if (profileError) return response({ error: "Auth invitation was sent, but the application profile could not be created. Contact the database administrator before retrying.", invitationCreated: true, userId: invited.user.id }, 502)
    return response({ userId: invited.user.id })
  }

  if (body.action === "update") {
    const userId = typeof body.userId === "string" ? body.userId : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const organization = typeof body.organization === "string" ? body.organization.trim() : ""
    const role = body.role
    const status = body.status
    const scope = { state_id: typeof body.stateId === "string" ? body.stateId : null, district_id: typeof body.districtId === "string" ? body.districtId : null, block_id: typeof body.blockId === "string" ? body.blockId : null, village_id: typeof body.villageId === "string" ? body.villageId : null }
    if (!userId || !name || !roles.includes(role as Role) || !["ACTIVE", "SUSPENDED"].includes(String(status))) return response({ error: "Provide user ID, name, supported role, and account status." }, 400)
    if (!isValidScope(role as Role, scope)) return response({ error: "Assign the required administrative area for this officer role." }, 400)
    if (userId === caller.id && status === "SUSPENDED") return response({ error: "You cannot suspend your own administrator account." }, 409)
    const { data: existing, error: existingError } = await admin.from("profiles").select("role, status, metadata").eq("user_id", userId).maybeSingle()
    if (existingError) return response({ error: "User profile could not be read." }, 502)
    if (!existing) {
      const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(userId)
      if (authUserError || !authUser.user) return response({ error: "Auth user was not found." }, 404)
      const { error: insertError } = await admin.from("profiles").insert({ user_id: userId, display_name: name, role, status, metadata: { organization }, ...scope })
      if (insertError) return response({ error: "Application profile could not be created." }, 502)
      return response({ userId })
    }
    const removesAdmin = existing.role === "ADMIN" && existing.status === "ACTIVE" && (role !== "ADMIN" || status !== "ACTIVE")
    if (removesAdmin) {
      const { count, error } = await admin.from("profiles").select("user_id", { count: "exact", head: true }).eq("role", "ADMIN").eq("status", "ACTIVE")
      if (error) return response({ error: "Active administrator count could not be checked." }, 502)
      if ((count ?? 0) <= 1) return response({ error: "At least one active administrator must remain." }, 409)
    }
    const previousMetadata = typeof existing.metadata === "object" && existing.metadata !== null ? existing.metadata as Record<string, unknown> : {}
    const { error } = await admin.from("profiles").update({ display_name: name, role, status, metadata: { ...previousMetadata, organization }, ...scope }).eq("user_id", userId)
    if (error) return response({ error: "User profile could not be updated." }, 502)
    return response({ userId })
  }
  return response({ error: "Unknown action." }, 400)
})
