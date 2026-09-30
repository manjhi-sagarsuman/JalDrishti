/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2"

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/geo+json",
}

const supportedLayers = new Set([
  "districts",
  "blocks",
  "villages",
  "watersheds",
  "interventions",
  "evidence",
  "satellite-scenes",
  "change-analysis",
])

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers })
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers })
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed. Only GET is supported." }, 405)

  const url = new URL(request.url)
  const segments = url.pathname.split("/").filter(Boolean)
  
  // Support /map/:layer, /map-api/:layer, or direct /:layer
  let requestedLayer = segments.at(-1) ?? ""
  if (segments.length >= 2 && (segments[0] === "map" || segments[0] === "map-api")) {
    requestedLayer = segments[1]
  }

  if (!supportedLayers.has(requestedLayer)) {
    return jsonResponse(
      {
        error: `Invalid map layer '${requestedLayer}'. Supported endpoints: /map/districts, /map/blocks, /map/villages, /map/watersheds, /map/interventions, /map/evidence, /map/satellite-scenes, /map/change-analysis`,
      },
      404
    )
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!supabaseUrl || !anonKey) {
    return jsonResponse({ error: "Central Map API environment is not configured." }, 500)
  }

  const authorization = request.headers.get("Authorization")
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: authorization ? { headers: { Authorization: authorization } } : undefined,
  })

  const { data, error } = await client.rpc("get_public_map_features", { requested_layer: requestedLayer })

  if (error) {
    console.error(`PostGIS error fetching map layer '${requestedLayer}':`, error)
    return jsonResponse({ error: `Failed to load ${requestedLayer} GIS layer from database.` }, 502)
  }

  const result = data && typeof data === "object" && data.type === "FeatureCollection"
    ? data
    : { type: "FeatureCollection", features: [] }

  return jsonResponse(result, 200)
})
