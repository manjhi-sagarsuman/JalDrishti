import fs from "node:fs"
import path from "node:path"

console.log("=== Checking JalDrishti Change Analysis Pipeline (Chunk 10) ===")

const migrationPath = path.resolve("database/migrations/20260929002000_change_analysis_pipeline.sql")
if (!fs.existsSync(migrationPath)) {
  console.error("FAIL: Missing migration database/migrations/20260929002000_change_analysis_pipeline.sql")
  process.exit(1)
}

const migrationSql = fs.readFileSync(migrationPath, "utf8")
const requiredColumns = [
  "watershed_code",
  "before_indicator",
  "before_date",
  "before_value",
  "after_indicator",
  "after_date",
  "after_value",
  "observed_change",
  "affected_area",
  "processing_method",
  "summary"
]

for (const col of requiredColumns) {
  if (!migrationSql.includes(col)) {
    console.error(`FAIL: Migration missing required column pattern '${col}'`)
    process.exit(1)
  }
}

if (!migrationSql.includes("get_change_analysis_feature_collection") || !migrationSql.includes("'vegetation-change'")) {
  console.error("FAIL: Migration missing get_change_analysis_feature_collection or layerId 'vegetation-change'")
  process.exit(1)
}
console.log("PASS: Migration 20260929002000 defines required schema and get_change_analysis_feature_collection() with layerId 'vegetation-change'.")

const servicePath = path.resolve("src/services/changeAnalysisService.ts")
if (!fs.existsSync(servicePath)) {
  console.error("FAIL: Missing src/services/changeAnalysisService.ts")
  process.exit(1)
}

const serviceCode = fs.readFileSync(servicePath, "utf8")
if (!serviceCode.includes("calculateObservedChange") || !serviceCode.includes("getChangeAnalysisFeatureCollection")) {
  console.error("FAIL: changeAnalysisService.ts must export calculateObservedChange and getChangeAnalysisFeatureCollection")
  process.exit(1)
}
console.log("PASS: changeAnalysisService.ts provides calculateObservedChange and getChangeAnalysisFeatureCollection.")

const changeDetectionPageCode = fs.readFileSync(path.resolve("src/features/change-detection/ChangeDetectionPage.tsx"), "utf8")
if (!changeDetectionPageCode.includes("Insufficient satellite observations available") && !changeDetectionPageCode.includes("insufficient observations")) {
  console.error("FAIL: ChangeDetectionPage.tsx must handle empty state for insufficient observations.")
  process.exit(1)
}
console.log("PASS: ChangeDetectionPage.tsx provides empty state for insufficient observations.")
console.log("Chunk 10 check passed successfully.")
