/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

const DEFAULT_BHUVAN_BASE_URL = "https://bhuvan-vec1.nrsc.gov.in/bhuvan"

function errorResponse(message: string, status = 400, details?: unknown) {
  return new Response(
    JSON.stringify({
      error: message,
      status,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  )
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const pathParts = url.pathname.split("/").filter(Boolean)
  const route = pathParts.at(-1) || "status"

  const bhuvanToken = Deno.env.get("BHUVAN_ACCESS_TOKEN") || Deno.env.get("BHUVAN_TOKEN")
  const bhuvanBaseUrl = (Deno.env.get("BHUVAN_API_BASE_URL") || DEFAULT_BHUVAN_BASE_URL).replace(/\/$/, "")

  if (route === "status" || route === "bhuvan-proxy") {
    return new Response(
      JSON.stringify({
        status: "online",
        service: "JalDrishti Bhuvan Secure Proxy",
        configured: Boolean(bhuvanToken),
        baseUrl: bhuvanBaseUrl,
        attribution: "Data & Satellite Layers © ISRO / NRSC / Bhuvan, Government of India",
        supportedEndpoints: ["/wms", "/wmts", "/geocode", "/reverse-geocode"],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }

  if (route === "wms" || route === "wmts") {
    const upstreamUrl = new URL(
      route === "wms" ? `${bhuvanBaseUrl}/wms` : `${bhuvanBaseUrl}/wmts`
    )

    for (const [key, value] of url.searchParams.entries()) {
      upstreamUrl.searchParams.set(key, value)
    }

    if (bhuvanToken) {
      upstreamUrl.searchParams.set("token", bhuvanToken)
      upstreamUrl.searchParams.set("access_token", bhuvanToken)
    }

    try {
      const upstreamResponse = await fetch(upstreamUrl.toString(), {
        method: "GET",
        headers: {
          Accept: "image/png,image/jpeg,image/webp,*/*",
          "User-Agent": "JalDrishti-GIS-Backend/1.0",
        },
      })

      if (!upstreamResponse.ok) {
        return errorResponse(
          `Bhuvan ${route.toUpperCase()} service responded with status ${upstreamResponse.status}`,
          upstreamResponse.status
        )
      }

      const contentType = upstreamResponse.headers.get("content-type") || "image/png"
      const imageBytes = await upstreamResponse.arrayBuffer()

      return new Response(imageBytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
          "X-Attribution": "ISRO / NRSC Bhuvan",
        },
      })
    } catch (err) {
      return errorResponse(
        `Failed to reach Bhuvan upstream: ${err instanceof Error ? err.message : String(err)}`,
        502
      )
    }
  }

  if (route === "geocode") {
    const query = url.searchParams.get("query") || url.searchParams.get("q")
    const state = url.searchParams.get("state") || "Maharashtra"
    const district = url.searchParams.get("district") || ""

    if (!query) {
      return errorResponse("Missing required query parameter for village geocoding", 400)
    }

    const geocodeUrl = new URL(`${bhuvanBaseUrl}/geocoding/village`)
    geocodeUrl.searchParams.set("village", query)
    if (state) geocodeUrl.searchParams.set("state", state)
    if (district) geocodeUrl.searchParams.set("district", district)
    if (bhuvanToken) geocodeUrl.searchParams.set("token", bhuvanToken)

    try {
      const upstreamResponse = await fetch(geocodeUrl.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "JalDrishti-GIS-Backend/1.0",
        },
      })

      if (!upstreamResponse.ok) {
        return errorResponse(
          `Bhuvan geocoding service error (${upstreamResponse.status})`,
          upstreamResponse.status
        )
      }

      const data = await upstreamResponse.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    } catch (err) {
      return errorResponse(
        `Geocoding upstream connection failed: ${err instanceof Error ? err.message : String(err)}`,
        502
      )
    }
  }

  if (route === "reverse-geocode") {
    const lat = url.searchParams.get("lat") || url.searchParams.get("latitude")
    const lon = url.searchParams.get("lon") || url.searchParams.get("longitude") || url.searchParams.get("lng")

    if (!lat || !lon) {
      return errorResponse("Both latitude and longitude parameters are required", 400)
    }

    const revUrl = new URL(`${bhuvanBaseUrl}/geocoding/reverse`)
    revUrl.searchParams.set("lat", lat)
    revUrl.searchParams.set("lon", lon)
    if (bhuvanToken) revUrl.searchParams.set("token", bhuvanToken)

    try {
      const upstreamResponse = await fetch(revUrl.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "JalDrishti-GIS-Backend/1.0",
        },
      })

      if (!upstreamResponse.ok) {
        return errorResponse(
          `Bhuvan reverse geocoding service error (${upstreamResponse.status})`,
          upstreamResponse.status
        )
      }

      const data = await upstreamResponse.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    } catch (err) {
      return errorResponse(
        `Reverse geocoding upstream connection failed: ${err instanceof Error ? err.message : String(err)}`,
        502
      )
    }
  }

  return errorResponse(`Unknown Bhuvan proxy route: ${route}`, 404)
})
