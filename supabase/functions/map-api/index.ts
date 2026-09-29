/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2"

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/geo+json",
}
const layers = new Set(["districts", "blocks", "villages", "watersheds", "interventions", "evidence", "satellite-scenes", "change-analysis"])

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers })
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  if (request.method !== "GET") return response({ error: "Method not allowed." }, 405)
  const requestedLayer = new URL(request.url).pathname.split("/").filter(Boolean).at(-1) ?? ""
  if (!layers.has(requestedLayer)) return response({ type: "FeatureCollection", features: [] }, 404)

  const url = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!url || !anonKey) return response({ error: "Map API is not configured." }, 500)
  const authorization = request.headers.get("Authorization")
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: authorization ? { headers: { Authorization: authorization } } : undefined,
  })
  const { data, error } = await client.rpc("get_public_map_features", { requested_layer: requestedLayer })
  if (error) return response({ error: "Map layer could not be loaded." }, 502)
  return response(data ?? { type: "FeatureCollection", features: [] })
})