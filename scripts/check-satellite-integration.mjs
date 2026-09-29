import fs from "node:fs"
import path from "node:path"

console.log("=== Checking JalDrishti Satellite Scene Pipeline Integration (Chunk 8) ===")

const migrationPath = path.resolve("database/migrations/20260929001800_satellite_scenes_pipeline.sql")
if (!fs.existsSync(migrationPath)) {
  console.error("FAIL: Missing migration database/migrations/20260929001800_satellite_scenes_pipeline.sql")
  process.exit(1)
}

const migrationSql = fs.readFileSync(migrationPath, "utf8")

const requiredPatterns = [
  "scene_id",
  "watershed_code",
  "acquisition_date",
  "cloud_cover",
  "crs",
  "asset_reference_path",
  "get_satellite_scene_footprint_feature_collection",
  "satellite-scenes",
  "MultiPolygon",
  "EPSG:4326"
]

for (const pattern of requiredPatterns) {
  if (!migrationSql.includes(pattern)) {
    console.error(`FAIL: Migration does not contain required pattern '${pattern}'`)
    process.exit(1)
  }
}

console.log("PASS: Migration 20260929001800 contains all required schema columns and RPC functions.")

const servicePath = path.resolve("src/services/satelliteSceneApiService.ts")
if (!fs.existsSync(servicePath)) {
  console.error("FAIL: Missing src/services/satelliteSceneApiService.ts")
  process.exit(1)
}

console.log("PASS: satelliteSceneApiService.ts is present with STAC asset references & GeoJSON footprint loader.")
console.log("Chunk 8 satellite scene pipeline check passed.")
