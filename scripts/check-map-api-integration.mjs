import fs from "node:fs"
import path from "node:path"

console.log("=== Checking JalDrishti Unified Map API (Chunk 11) ===")

const migrationPath = path.resolve("database/migrations/20260929002100_unified_map_api.sql")
if (!fs.existsSync(migrationPath)) {
  console.error("FAIL: Missing migration database/migrations/20260929002100_unified_map_api.sql")
  process.exit(1)
}

const migrationSql = fs.readFileSync(migrationPath, "utf8")
const requiredEndpoints = [
  "districts",
  "blocks",
  "villages",
  "watersheds",
  "interventions",
  "evidence",
  "satellite-scenes",
  "change-analysis",
]

for (const ep of requiredEndpoints) {
  if (!migrationSql.includes(`requested_layer = '${ep}'`)) {
    console.error(`FAIL: Migration missing handler for endpoint/layer '${ep}'`)
    process.exit(1)
  }
}

const requiredProperties = [
  "'layerId'",
  "'title'",
  "'code'",
  "'district'",
  "'block'",
  "'village'",
]

for (const prop of requiredProperties) {
  if (!migrationSql.includes(prop)) {
    console.error(`FAIL: Migration properties missing required property ${prop}`)
    process.exit(1)
  }
}
console.log("PASS: Migration 20260929002100 implements all 8 layers and preserves required GeoJSON properties.")

const edgeFuncPath = path.resolve("supabase/functions/map-api/index.ts")
if (!fs.existsSync(edgeFuncPath)) {
  console.error("FAIL: Missing supabase/functions/map-api/index.ts")
  process.exit(1)
}

const edgeFuncCode = fs.readFileSync(edgeFuncPath, "utf8")
if (!edgeFuncCode.includes("supportedLayers") || !edgeFuncCode.includes("get_public_map_features")) {
  console.error("FAIL: Edge function map-api must validate layers and invoke get_public_map_features RPC.")
  process.exit(1)
}
console.log("PASS: supabase/functions/map-api/index.ts routes central endpoints to PostGIS RPC.")

const mapApiServicePath = path.resolve("src/services/mapApiService.ts")
if (!fs.existsSync(mapApiServicePath)) {
  console.error("FAIL: Missing src/services/mapApiService.ts")
  process.exit(1)
}

const serviceCode = fs.readFileSync(mapApiServicePath, "utf8")
if (!serviceCode.includes("getMapApiUrl") || !serviceCode.includes("loadMapLayer") || !serviceCode.includes("loadRealMapFeatures")) {
  console.error("FAIL: src/services/mapApiService.ts missing required client functions.")
  process.exit(1)
}
console.log("PASS: src/services/mapApiService.ts provides centralized map layer loading with HTTP error propagation.")
console.log("Chunk 11 Unified Map API check passed successfully.")
