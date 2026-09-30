/**
 * Centralized Data Sources & Authoritative Registry Configuration for JalDrishti
 */
export interface DataSourceInfo {
  id: string
  name: string
  agency: string
  url: string
  attribution: string
  dataTypes: string[]
  license: string
  status: "ACTIVE" | "ONLINE" | "OPERATIONAL_CACHE"
  updateFrequency: string
}

export const DATA_SOURCES: DataSourceInfo[] = [
  {
    id: "bhuvan_isro",
    name: "Bhuvan Geoportal (ISRO / NRSC)",
    agency: "National Remote Sensing Centre, ISRO, Government of India",
    url: "https://bhuvan.nrsc.gov.in",
    attribution: "© NRSC / ISRO, Government of India",
    dataTypes: ["Watershed Boundaries", "LULC 50k", "Geomorphology", "National Water Bodies"],
    license: "Government Open Data / Bhuvan Terms of Service",
    status: "ACTIVE",
    updateFrequency: "Periodic / Satellite Cycle",
  },
  {
    id: "sentinel_copernicus",
    name: "Sentinel-2 MSI (Copernicus)",
    agency: "European Space Agency (ESA) / Copernicus Programme",
    url: "https://browser.dataspace.copernicus.eu",
    attribution: "Contains modified Copernicus Sentinel data / ESA / EOX",
    dataTypes: ["Multispectral Imagery (10m)", "NDVI", "NDWI", "Optical Scene Footprints"],
    license: "Copernicus Open Access Policy",
    status: "ACTIVE",
    updateFrequency: "5-day revisit cycle",
  },
  {
    id: "landsat_usgs",
    name: "Landsat 8-9 OLI/TIRS",
    agency: "USGS / NASA",
    url: "https://landsat.gsfc.nasa.gov",
    attribution: "USGS / NASA Landsat Program",
    dataTypes: ["Thermal IR", "Surface Reflectance", "Historical Land Baseline"],
    license: "Public Domain",
    status: "ACTIVE",
    updateFrequency: "8-day combined revisit",
  },
  {
    id: "open_elevation_srtm",
    name: "NASA SRTM & OpenTopography DEM",
    agency: "NASA JPL / OpenTopography / Mapzen Terrarium",
    url: "https://portal.opentopography.org",
    attribution: "NASA SRTM 30m / USGS / Mapzen / OpenTopography",
    dataTypes: ["Digital Elevation Model (DEM 30m)", "Slope", "Aspect", "Hillshade", "Contours"],
    license: "Open Data Commons / NASA Open Access",
    status: "ACTIVE",
    updateFrequency: "Static High-Precision Elevation Grid",
  },
  {
    id: "open_meteo_weather",
    name: "Open-Meteo Meteorological & Hydrological API",
    agency: "Open-Meteo / ECMWF / IMD Ground Radar Integration",
    url: "https://open-meteo.com",
    attribution: "Weather data by Open-Meteo (under CC BY 4.0), ECMWF, IMD",
    dataTypes: ["Precipitation", "Rainfall History", "Soil Moisture", "Evapotranspiration"],
    license: "CC BY 4.0",
    status: "ACTIVE",
    updateFrequency: "Hourly",
  },
  {
    id: "osm_hydrology",
    name: "OpenStreetMap Indian Waterways & Drainage Network",
    agency: "OpenStreetMap Contributors / Overpass API",
    url: "https://www.openstreetmap.org",
    attribution: "© OpenStreetMap contributors (ODbL)",
    dataTypes: ["Rivers", "Streams", "Canals", "Reservoirs", "Lakes", "Check Dams"],
    license: "Open Database License (ODbL)",
    status: "ACTIVE",
    updateFrequency: "Continuous / Community Verified",
  },
  {
    id: "india_admin_gis",
    name: "Bharat Administrative Boundaries",
    agency: "Survey of India / Local Government Directory (LGD) / DataMeet",
    url: "https://lgdirectory.gov.in",
    attribution: "Survey of India / LGD / DataMeet Community",
    dataTypes: ["State Boundaries", "District Boundaries", "Taluk/Block Polygons", "Centroids"],
    license: "Open Government Data License - India (OGDL)",
    status: "ACTIVE",
    updateFrequency: "Annual / Administrative Reorganization",
  },
]
