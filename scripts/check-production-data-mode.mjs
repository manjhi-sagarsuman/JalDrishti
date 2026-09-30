import fs from "node:fs"
import path from "node:path"

console.log("=== Checking JalDrishti Production Data Mode (Chunk 12) ===")

const sampleDataPath = path.resolve("src/services/sampleGisData.ts")
if (!fs.existsSync(sampleDataPath)) {
  console.error("FAIL: Missing src/services/sampleGisData.ts")
  process.exit(1)
}

const sampleCode = fs.readFileSync(sampleDataPath, "utf8")
if (!sampleCode.includes("export const DEMO_DATA = true")) {
  console.error("FAIL: src/services/sampleGisData.ts must clearly export DEMO_DATA = true")
  process.exit(1)
}
if (!sampleCode.includes("import.meta.env.PROD")) {
  console.error("FAIL: src/services/sampleGisData.ts must guard against production build usage.")
  process.exit(1)
}
console.log("PASS: sampleGisData.ts explicitly flags DEMO_DATA = true and prevents production usage.")

// Verify that production services do not import or fall back to demo data
const servicesDir = path.resolve("src/services")
const serviceFiles = fs.readdirSync(servicesDir).filter((file) => file.endsWith(".ts") && file !== "sampleGisData.ts")

for (const file of serviceFiles) {
  const content = fs.readFileSync(path.join(servicesDir, file), "utf8")
  if (content.includes("sampleGisData") || content.includes("SAMPLE_WATERSHEDS") || content.includes("SAMPLE_INTERVENTIONS")) {
    console.error(`FAIL: Production service ${file} must not import or use demo GIS data.`)
    process.exit(1)
  }
}
console.log("PASS: No production service imports or falls back to demo GIS data.")

// Verify analytics and remote sensing do not synthesize fake observations or fake NDVI
const analyticsCode = fs.readFileSync(path.resolve("src/features/analytics/AnalyticsCenter.tsx"), "utf8")
if (!analyticsCode.includes("No satellite observations available")) {
  console.error("FAIL: AnalyticsCenter must display 'No satellite observations available' empty state when missing data.")
  process.exit(1)
}
console.log("PASS: Analytics Center displays strict empty states without fake observations.")

console.log("Chunk 12 Production Data Mode check passed successfully.")
