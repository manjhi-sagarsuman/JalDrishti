"""
Authoritative and Open Geospatial Data Source Registry for JalDrishti
"""
from typing import Dict, Any, List
from datetime import datetime, timezone

DATA_SOURCE_REGISTRY: Dict[str, Dict[str, Any]] = {
    "bhuvan_isro": {
        "id": "bhuvan_isro",
        "name": "Bhuvan Geoportal (ISRO / NRSC)",
        "agency": "National Remote Sensing Centre, ISRO, Government of India",
        "url": "https://bhuvan.nrsc.gov.in",
        "wms_endpoint": "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms",
        "attribution": "© NRSC / ISRO, Government of India",
        "data_types": ["Watershed Boundaries", "LULC", "Geomorphology", "Water Bodies"],
        "license": "Government Open Data / Bhuvan Terms of Service",
        "status": "ACTIVE",
        "update_frequency": "Periodic / Satellite Cycle",
        "last_verified": datetime.now(timezone.utc).isoformat(),
    },
    "sentinel_copernicus": {
        "id": "sentinel_copernicus",
        "name": "Sentinel-2 MSI (Copernicus)",
        "agency": "European Space Agency (ESA) / Copernicus Programme",
        "url": "https://browser.dataspace.copernicus.eu",
        "tile_endpoint": "https://tiles.maps.eox.at/wms",
        "attribution": "Contains modified Copernicus Sentinel data [2024-2026] / ESA",
        "data_types": ["Multispectral Imagery (10m)", "NDVI", "NDWI", "Optical Scene Metadata"],
        "license": "Copernicus Open Access Policy",
        "status": "ACTIVE",
        "update_frequency": "5-day revisit cycle",
        "last_verified": datetime.now(timezone.utc).isoformat(),
    },
    "landsat_usgs": {
        "id": "landsat_usgs",
        "name": "Landsat 8-9 OLI/TIRS",
        "agency": "USGS / NASA",
        "url": "https://landsat.gsfc.nasa.gov",
        "attribution": "USGS / NASA Landsat Program",
        "data_types": ["Thermal", "Surface Reflectance", "Long-term Land Use History"],
        "license": "Public Domain",
        "status": "ACTIVE",
        "update_frequency": "8-day combined revisit",
        "last_verified": datetime.now(timezone.utc).isoformat(),
    },
    "open_elevation_srtm": {
        "id": "open_elevation_srtm",
        "name": "NASA SRTM & OpenTopography DEM",
        "agency": "NASA JPL / OpenTopography / Mapzen Terrarium",
        "url": "https://portal.opentopography.org",
        "tile_endpoint": "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
        "attribution": "NASA SRTM / USGS / Mapzen / OpenTopography",
        "data_types": ["Digital Elevation Model (DEM 30m)", "Slope", "Aspect", "Hillshade", "Contours"],
        "license": "Open Data Commons / NASA Open Access",
        "status": "ACTIVE",
        "update_frequency": "Static High-Precision Elevation Grid",
        "last_verified": datetime.now(timezone.utc).isoformat(),
    },
    "open_meteo_weather": {
        "id": "open_meteo_weather",
        "name": "Open-Meteo Meteorological & Hydrological API",
        "agency": "Open-Meteo / ECMWF / IMD Ground Radar Integration",
        "url": "https://open-meteo.com",
        "api_endpoint": "https://api.open-meteo.com/v1/forecast",
        "attribution": "Weather data by Open-Meteo (under CC BY 4.0), ECMWF, IMD",
        "data_types": ["Precipitation", "Rainfall History", "Soil Moisture", "Evapotranspiration", "Temperature"],
        "license": "CC BY 4.0",
        "status": "ACTIVE",
        "update_frequency": "Hourly",
        "last_verified": datetime.now(timezone.utc).isoformat(),
    },
    "osm_hydrology": {
        "id": "osm_hydrology",
        "name": "OpenStreetMap Indian Waterways & Drainage Network",
        "agency": "OpenStreetMap Contributors / Overpass API",
        "url": "https://www.openstreetmap.org",
        "overpass_endpoint": "https://overpass-api.de/api/interpreter",
        "attribution": "© OpenStreetMap contributors (ODbL)",
        "data_types": ["Rivers", "Streams", "Canals", "Reservoirs", "Lakes", "Check Dams"],
        "license": "Open Database License (ODbL)",
        "status": "ACTIVE",
        "update_frequency": "Continuous / Community Verified",
        "last_verified": datetime.now(timezone.utc).isoformat(),
    },
    "india_admin_gis": {
        "id": "india_admin_gis",
        "name": "Bharat Administrative Boundaries (State/District/Sub-district)",
        "agency": "Survey of India / DataMeet India / Local Government Directory (LGD)",
        "url": "https://lgdirectory.gov.in",
        "attribution": "Survey of India / LGD / DataMeet Community",
        "data_types": ["State Boundaries", "District Boundaries", "Taluk/Block Polygons", "Centroids"],
        "license": "Open Government Data License - India (OGDL)",
        "status": "ACTIVE",
        "update_frequency": "Annual / Administrative Reorganization",
        "last_verified": datetime.now(timezone.utc).isoformat(),
    },
}

def get_all_data_sources() -> List[Dict[str, Any]]:
    return list(DATA_SOURCE_REGISTRY.values())

def get_data_source(source_id: str) -> Dict[str, Any]:
    return DATA_SOURCE_REGISTRY.get(source_id, {
        "id": source_id,
        "name": "Unknown Source",
        "status": "UNAVAILABLE",
        "attribution": "Source not registered",
    })
