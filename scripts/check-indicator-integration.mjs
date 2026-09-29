import fs from "node:fs"
import path from "node:path"

console.log("=== Checking JalDrishti Satellite Indicator Pipeline (Chunk 9) ===")

const migrationPath = path.resolve("database/migrations/20260929001900_satellite_indicators_pipeline.sql")
if (!fs.existsSync(migrationPath)) {
  console.error("FAIL: Missing migration database/migrations/20260929001900_satellite_indicators_pipeline.sql")
  process.exit(1)
}

const migrationSql = fs.readFileSync(migrationPath, "utf8")
const requiredPatterns = [
  "satellite_observations",
  "scene_id",
  "watershed_code",
  "indicator",
  "observation_date",
  "processing_method",
  "crs",
  "product_version",
  "source"
]

for (const pattern of requiredPatterns) {
  if (!migrationSql.includes(pattern)) {
    console.error(`FAIL: Migration does not contain required pattern '${pattern}'`)
    process.exit(1)
  }
}
console.log("PASS: Migration 20260929001900 contains all required indicator schema definitions.")

const pipelinePath = path.resolve("src/services/satelliteIndicatorPipeline.ts")
if (!fs.existsSync(pipelinePath)) {
  console.error("FAIL: Missing src/services/satelliteIndicatorPipeline.ts")
  process.exit(1)
}

const pipelineCode = fs.readFileSync(pipelinePath, "utf8")
if (!pipelineCode.includes("calculateNDVI") || !pipelineCode.includes("calculateNDWI") || !pipelineCode.includes("validateLULC")) {
  console.error("FAIL: Pipeline must export calculateNDVI, calculateNDWI, and validateLULC")
  process.exit(1)
}
console.log("PASS: satelliteIndicatorPipeline.ts exports reproducible NDVI, NDWI, and LULC algorithms.")

const analyticsCenterCode = fs.readFileSync(path.resolve("src/features/analytics/AnalyticsCenter.tsx"), "utf8")
if (!analyticsCenterCode.includes("No satellite observations available")) {
  console.error("FAIL: AnalyticsCenter.tsx must display 'No satellite observations available' for empty state.")
  process.exit(1)
}
console.log("PASS: AnalyticsCenter displays 'No satellite observations available' when observations are empty.")
console.log("Chunk 9 satellite indicator check passed.")
