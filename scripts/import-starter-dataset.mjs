import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { createClient } from "@supabase/supabase-js"

const root = path.resolve("data/maharashtra/starter")
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local shell before importing.")

const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ""
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1 } else quoted = !quoted
    } else if (character === "," && !quoted) { row.push(field); field = ""
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1
      row.push(field); field = ""
      if (row.some((value) => value !== "")) rows.push(row)
      row = []
    } else field += character
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const [headers, ...values] = rows
  return values.map((value) => Object.fromEntries(headers.map((header, index) => [header, value[index] ?? ""])))
}

function uuidFor(prefix, value) {
  const hex = createHash("sha256").update(`${prefix}:${value}`).digest("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

function pointWkt(longitude, latitude) { return `SRID=4326;POINT(${longitude} ${latitude})` }
function squareWkt(longitude, latitude, size = 0.002) {
  const west = Number(longitude) - size; const east = Number(longitude) + size
  const south = Number(latitude) - size; const north = Number(latitude) + size
  return `SRID=4326;MULTIPOLYGON(((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south})))`
}
function polygonWkt(coordinates) {
  const rings = coordinates.map((ring) => `(${ring.map(([longitude, latitude]) => `${longitude} ${latitude}`).join(",")})`).join(",")
  return `SRID=4326;MULTIPOLYGON((` + rings.replace(/^\(|\)$/g, "") + "))"
}
function valueOrNull(value) { return value === "" ? null : value }
async function csv(name) { return parseCsv(await readFile(path.join(root, name), "utf8")) }
async function must(query, label) { const result = await query; if (result.error) throw new Error(`${label}: ${result.error.message}`); return result.data }

const administrative = await csv("administrative.csv")
const watersheds = await csv("watersheds.csv")
const interventions = await csv("interventions.csv")
const photos = await csv("geo_tagged_photos.csv")
const scenes = await csv("satellite_scenes.csv")
const observations = await csv("satellite_observations.csv")
const changes = await csv("change_analysis.csv")
const geojson = JSON.parse(await readFile(path.join(root, "watersheds.geojson"), "utf8"))
const internalMetadata = { isDemo: true, dataset: "jaldrishti_supabase_starter_dataset", importedAt: new Date().toISOString() }

const state = (await must(client.from("states").select("id").eq("code", "MH").maybeSingle(), "Load Maharashtra state"))?.id
if (!state) throw new Error("Maharashtra state (code MH) is missing. Apply the base seed migration first.")
const sourceId = uuidFor("data-source", "jaldrishti_supabase_starter_dataset")
await must(client.from("data_sources").upsert({ id: sourceId, code: "JALDRISHTI_STARTER_DATASET", name: "JalDrishti starter dataset", organization: "JalDrishti project team", source_url: "https://data.gov.in/catalog/local-government-directory-lgd", license: "See attached manifest and provenance.csv", description: "Imported starter records with source-backed administrative references and synthetic workflow records.", metadata: internalMetadata }, { onConflict: "id" }), "Register source")

const districtRows = new Map()
const blockRows = new Map()
const villageRows = new Map()
const existingDistricts = await must(client.from("districts").select("id, name").eq("state_id", state), "Load existing districts")
const existingBlocks = await must(client.from("blocks").select("id, name, district_id"), "Load existing blocks")
for (const row of administrative) {
  const existingDistrict = existingDistricts.find((item) => item.name.toLowerCase() === row.district_name.toLowerCase())
  const districtId = districtRows.get(row.district_code) ?? existingDistrict?.id ?? uuidFor("district", row.district_code)
  districtRows.set(row.district_code, districtId)
  const existingBlock = existingBlocks.find((item) => item.name.toLowerCase() === row.block_name.toLowerCase() && item.district_id === districtId)
  const blockId = blockRows.get(row.block_code) ?? existingBlock?.id ?? uuidFor("block", row.block_code)
  blockRows.set(row.block_code, blockId)
  const villageId = uuidFor("village", row.village_code)
  villageRows.set(row.village_code, villageId)
  await must(client.from("districts").upsert({ id: districtId, state_id: state, code: row.district_code, name: row.district_name, boundary: squareWkt(row.village_longitude, row.village_latitude, 0.25), metadata: internalMetadata }, { onConflict: "id" }), `Import district ${row.district_name}`)
  await must(client.from("blocks").upsert({ id: blockId, district_id: districtId, code: row.block_code, name: row.block_name, boundary: squareWkt(row.village_longitude, row.village_latitude, 0.12), metadata: internalMetadata }, { onConflict: "id" }), `Import block ${row.block_name}`)
  await must(client.from("villages").upsert({ id: villageId, block_id: blockId, code: row.village_code, name: row.village_name, boundary: squareWkt(row.village_longitude, row.village_latitude), metadata: { ...internalMetadata, latitude: Number(row.village_latitude), longitude: Number(row.village_longitude), boundary_status: row.boundary_status } }, { onConflict: "id" }), `Import village ${row.village_name}`)
}

const watershedIds = new Map()
for (const row of watersheds) {
  const feature = geojson.features.find((item) => item.properties?.watershed_code === row.watershed_code)
  if (!feature || feature.geometry?.type !== "Polygon") throw new Error(`Missing Polygon geometry for ${row.watershed_code}`)
  const watershedId = uuidFor("watershed", row.watershed_code)
  watershedIds.set(row.watershed_code, watershedId)
  await must(client.from("watersheds").upsert({ id: watershedId, code: row.watershed_code, name: row.watershed_name, status: row.status === "MONITORED" ? "ACTIVE" : "PLANNED", boundary: polygonWkt(feature.geometry.coordinates), area_sq_km: Number(row.area_km2), metadata: { ...internalMetadata, centroid_latitude: Number(row.centroid_latitude), centroid_longitude: Number(row.centroid_longitude), boundary_source: row.boundary_source } }, { onConflict: "id" }), `Import watershed ${row.watershed_code}`)
  for (const villageCode of row.linked_village_codes.split(";")) await must(client.from("watershed_villages").upsert({ watershed_id: watershedId, village_id: villageRows.get(villageCode), coverage_percent: 100 / row.linked_village_codes.split(";").length, is_primary: villageCode === row.linked_village_codes.split(";")[0] }, { onConflict: "watershed_id,village_id" }), `Link village ${villageCode}`)
}

const types = await must(client.from("intervention_types").select("id, code"), "Load intervention types")
const typeIds = new Map(types.map((type) => [type.code, type.id]))
const typeCode = { "check dam": "CHECK_DAM", "farm pond": "FARM_POND", "contour bund": "CONTOUR_BUND", "loose boulder structure": "SOIL_CONSERVATION", "percolation trench": "WATER_CONSERVATION_STRUCTURE" }
const interventionIds = new Map()
for (const row of interventions) {
  const interventionId = uuidFor("intervention", row.intervention_code)
  interventionIds.set(row.intervention_code, interventionId)
  await must(client.from("interventions").upsert({ id: interventionId, watershed_id: watershedIds.get(row.watershed_code), village_id: villageRows.get(row.village_code), intervention_type_id: typeIds.get(typeCode[row.type] ?? "OTHER"), code: row.intervention_code, name: row.intervention_name, description: row.description, status: row.status.toUpperCase(), location: pointWkt(row.longitude, row.latitude), planned_start: valueOrNull(row.start_date), actual_start: row.status === "completed" ? valueOrNull(row.start_date) : null, actual_end: valueOrNull(row.completion_date), metadata: internalMetadata }, { onConflict: "id" }), `Import intervention ${row.intervention_code}`)
}

const sceneIds = new Map()
for (const row of scenes) {
  const sceneId = uuidFor("scene", row.scene_id)
  sceneIds.set(row.scene_id, sceneId)
  const footprint = JSON.parse(row.footprint_geojson)
  await must(client.from("satellite_scenes").upsert({ id: sceneId, watershed_id: watershedIds.get(row.watershed_code), data_source_id: sourceId, scene_identifier: row.scene_id, platform: row.platform, sensor: row.sensor, acquired_at: `${row.acquisition_date}T00:00:00Z`, cloud_cover_percent: Number(row.cloud_cover_percent), footprint: polygonWkt(footprint.coordinates), asset_path: row.asset_reference_path, status: "READY", metadata: { ...internalMetadata, crs: row.crs, product_collection: row.product_collection } }, { onConflict: "id" }), `Import scene ${row.scene_id}`)
}

const indicatorIds = new Map()
for (const row of observations) {
  const observationId = uuidFor("observation", `${row.scene_id}:${row.indicator}`)
  await must(client.from("satellite_observations").upsert({ id: observationId, watershed_id: watershedIds.get(row.watershed_code), satellite_scene_id: sceneIds.get(row.scene_id), data_source_id: sourceId, observation_code: row.indicator, observed_at: `${row.observation_date}T00:00:00Z`, statistic: "mean", value: Number(row.value), unit: row.unit, status: "AVAILABLE", raster_asset_path: null, quality_metadata: { ...internalMetadata, processing_method: row.processing_method } }, { onConflict: "id" }), `Import observation ${row.scene_id}/${row.indicator}`)
  const indicatorId = uuidFor("indicator", `${row.watershed_code}:${row.indicator}:${row.observation_date}`)
  indicatorIds.set(`${row.watershed_code}:${row.indicator}:${row.observation_date}`, indicatorId)
  await must(client.from("indicators").upsert({ id: indicatorId, watershed_id: watershedIds.get(row.watershed_code), source_observation_id: observationId, data_source_id: sourceId, indicator_code: row.indicator, name: row.indicator === "NDVI" ? "Normalized Difference Vegetation Index" : row.indicator === "NDWI" ? "Normalized Difference Water Index" : "Land use / land cover", observed_at: `${row.observation_date}T00:00:00Z`, value: Number(row.value), unit: row.unit, status: "VALIDATED", quality_metadata: { ...internalMetadata, processing_method: row.processing_method } }, { onConflict: "id" }), `Import indicator ${row.scene_id}/${row.indicator}`)
}

for (const row of changes) {
  const beforeId = indicatorIds.get(`${row.watershed_code}:${row.indicator}:${row.before_date}`)
  const afterId = indicatorIds.get(`${row.watershed_code}:${row.indicator}:${row.after_date}`)
  if (!beforeId || !afterId) throw new Error(`Missing before/after indicators for ${row.watershed_code}`)
  const area = JSON.parse(row.affected_area_geojson)
  await must(client.from("change_analysis").upsert({ id: uuidFor("change", `${row.watershed_code}:${row.indicator}:${row.before_date}:${row.after_date}`), watershed_id: watershedIds.get(row.watershed_code), baseline_indicator_id: beforeId, comparison_indicator_id: afterId, status: "REVIEWED", observed_change: Number(row.observed_change), affected_area: polygonWkt(area.coordinates), summary: row.summary, results: { indicator: row.indicator }, metadata: { ...internalMetadata, processing_method: row.processing_method } }, { onConflict: "id" }), `Import change ${row.watershed_code}`)
}

for (const row of photos) {
  const filePath = path.join(root, "photos", row.image_file)
  const storagePath = `starter/${row.file_name}`
  const file = await readFile(filePath)
  const upload = await client.storage.from("geo-photos").upload(storagePath, file, { contentType: "image/jpeg", upsert: true })
  if (upload.error) throw new Error(`Upload ${row.file_name}: ${upload.error.message}`)
  await must(client.from("geo_photos").upsert({ id: uuidFor("photo", row.file_name), watershed_id: watershedIds.get(row.watershed_code), intervention_id: interventionIds.get(row.intervention_code), storage_path: storagePath, file_name: row.file_name, mime_type: "image/jpeg", file_size_bytes: file.byteLength, location: pointWkt(row.longitude, row.latitude), captured_at: `${row.capture_date}T00:00:00Z`, gps_validation: "VALID", verification_status: "PENDING", notes: row.description, metadata: { ...internalMetadata, source_status: row.verification_status } }, { onConflict: "id" }), `Import photo ${row.file_name}`)
}

console.log(`Imported ${administrative.length} administrative rows, ${watersheds.length} watersheds, ${interventions.length} interventions, ${photos.length} photos, ${scenes.length} scenes, ${observations.length} observations, and ${changes.length} change records.`)