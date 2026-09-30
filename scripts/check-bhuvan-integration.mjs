import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

console.log("--- JalDrishti Chunk 7 Bhuvan Integration Verification ---")

const migrationPath = resolve("supabase/migrations/20260929001700_bhuvan_geospatial_and_provenance.sql")
if (!existsSync(migrationPath)) {
  console.error("FAIL: Migration not found at", migrationPath)
  process.exit(1)
}

const edgeFunctionPath = resolve("supabase/functions/bhuvan-proxy/index.ts")
if (!existsSync(edgeFunctionPath)) {
  console.error("FAIL: Edge Function not found at", edgeFunctionPath)
  process.exit(1)
}

const servicePath = resolve("src/services/bhuvanService.ts")
if (!existsSync(servicePath)) {
  console.error("FAIL: Bhuvan service not found at", servicePath)
  process.exit(1)
}

const migrationSql = readFileSync(migrationPath, "utf-8")
const edgeFunctionCode = readFileSync(edgeFunctionPath, "utf-8")
const serviceCode = readFileSync(servicePath, "utf-8")

const checks = [
  { name: "Provenance record for Bhuvan", target: migrationSql, pattern: /ISRO \/ NRSC Bhuvan/i },
  { name: "Bhuvan thematic layers table", target: migrationSql, pattern: /create table if not exists public\.bhuvan_thematic_layers/i },
  { name: "Thematic FeatureCollection RPC", target: migrationSql, pattern: /function public\.get_bhuvan_thematic_feature_collection/i },
  { name: "Edge Function reads BHUVAN_ACCESS_TOKEN server-side", target: edgeFunctionCode, pattern: /Deno\.env\.get\("BHUVAN_ACCESS_TOKEN"\)/ },
  { name: "Edge Function handles /wms and /wmts raster routes", target: edgeFunctionCode, pattern: /route === "wms" \|\| route === "wmts"/ },
  { name: "Edge Function handles /geocode route", target: edgeFunctionCode, pattern: /route === "geocode"/ },
  { name: "Client service never accesses BHUVAN_ACCESS_TOKEN", target: serviceCode, pattern: /BHUVAN_ACCESS_TOKEN/, invert: true },
  { name: "Attribution is preserved in client service", target: serviceCode, pattern: /BHUVAN_ATTRIBUTION/ },
  { name: "Village geocoding helper implemented", target: serviceCode, pattern: /geocodeVillageWithBhuvan/ },
]

let passed = true
for (const check of checks) {
  const match = check.pattern.test(check.target)
  const isOk = check.invert ? !match : match
  if (isOk) {
    console.log(`[PASS] ${check.name}`)
  } else {
    console.error(`[FAIL] ${check.name}`)
    passed = false
  }
}

if (!passed) {
  process.exit(1)
}
console.log("--- Bhuvan Verification Completed Successfully ---")
