"""
GIS Operations, Nearby Queries, Search, and Water Bodies
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from ..data_sources.administrative import get_states, get_districts, search_administrative_units
from ..data_sources.osm import fetch_water_bodies_in_bbox
from ..data_sources.elevation import get_point_elevation, generate_contour_geojson
from ..gis.geometry import haversine_distance_km
from ..gis.validation import validate_wgs84_coordinate

router = APIRouter(prefix="/api/gis", tags=["GIS"])

# Sample canonical Indian watersheds for Maharashtra pilot catchments
STANDARD_WATERSHEDS = [
    {
        "id": "WS-MH-PUN-001",
        "code": "4E2B5a",
        "name": "Mula-Mutha Upper Catchment",
        "state": "Maharashtra",
        "district": "Pune",
        "block": "Haveli",
        "area_ha": 6420.5,
        "center": [73.8567, 18.5204],
        "bbox": [73.72, 18.42, 73.98, 18.62],
        "elevation_min_m": 560,
        "elevation_max_m": 920,
        "elevation_mean_m": 680,
    },
    {
        "id": "WS-MH-AHM-002",
        "code": "4E2C3b",
        "name": "Pravara River Basin - Akole Sub-watershed",
        "state": "Maharashtra",
        "district": "Ahmednagar",
        "block": "Sangamner",
        "area_ha": 5230.0,
        "center": [74.3496, 19.3948],
        "bbox": [74.22, 19.28, 74.48, 19.52],
        "elevation_min_m": 510,
        "elevation_max_m": 780,
        "elevation_mean_m": 615,
    },
    {
        "id": "WS-MH-SAT-003",
        "code": "4D3A1c",
        "name": "Krishna Upper Tributary - Wai Micro-Watershed",
        "state": "Maharashtra",
        "district": "Satara",
        "block": "Wai",
        "area_ha": 4180.2,
        "center": [73.9183, 17.9505],
        "bbox": [73.80, 17.85, 74.05, 18.05],
        "elevation_min_m": 650,
        "elevation_max_m": 1280,
        "elevation_mean_m": 840,
    },
    {
        "id": "WS-MH-SOL-004",
        "code": "4E3F2d",
        "name": "Sina River Catchment - Mohol",
        "state": "Maharashtra",
        "district": "Solapur",
        "block": "Mohol",
        "area_ha": 7890.0,
        "center": [75.7064, 17.8199],
        "bbox": [75.55, 17.68, 75.88, 17.95],
        "elevation_min_m": 430,
        "elevation_max_m": 520,
        "elevation_mean_m": 465,
    },
]

@router.get("/nearby")
async def get_nearby_geospatial_features(
    lat: float = Query(..., description="Latitude (WGS84)"),
    lng: float = Query(..., description="Longitude (WGS84)"),
    radius_km: float = Query(50.0, description="Search radius in kilometers")
):
    valid, msg = validate_wgs84_coordinate(lat, lng)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    # 1. Real elevation at location
    elev_data = await get_point_elevation(lat, lng)

    # 2. Nearest Watersheds
    nearby_watersheds = []
    for w in STANDARD_WATERSHEDS:
        c_lon, c_lat = w["center"][0], w["center"][1]
        dist = haversine_distance_km(lat, lng, c_lat, c_lon)
        if dist <= radius_km:
            nearby_watersheds.append({**w, "distance_km": dist})
    nearby_watersheds.sort(key=lambda x: x["distance_km"])

    # 3. Water bodies in local bbox
    deg_radius = radius_km / 111.0
    wb_data = await fetch_water_bodies_in_bbox(
        west=lng - deg_radius,
        south=lat - deg_radius,
        east=lng + deg_radius,
        north=lat + deg_radius
    )

    return {
        "location": {"latitude": lat, "longitude": lng, "elevation": elev_data},
        "search_radius_km": radius_km,
        "nearest_watershed": nearby_watersheds[0] if nearby_watersheds else None,
        "all_nearby_watersheds": nearby_watersheds,
        "water_bodies_count": len(wb_data.get("features", [])),
        "water_bodies": wb_data.get("features", [])[:10],
    }

@router.get("/search")
async def global_gis_search(q: str = Query(..., min_length=2, description="Search term")):
    query = q.strip()
    admin_results = search_administrative_units(query)
    
    watershed_results = []
    for w in STANDARD_WATERSHEDS:
        if (query.lower() in w["name"].lower() or 
            query.lower() in w["code"].lower() or 
            query.lower() in w["district"].lower()):
            watershed_results.append({
                "type": "Watershed",
                "id": w["id"],
                "name": w["name"],
                "code": w["code"],
                "district": w["district"],
                "state": w["state"],
                "area_ha": w["area_ha"],
                "coordinates": w["center"],
                "bbox": w["bbox"],
                "display_name": f"{w['name']} ({w['code']}), {w['district']}",
            })

    return {
        "query": query,
        "total_matches": len(admin_results) + len(watershed_results),
        "results": watershed_results + admin_results,
    }

@router.get("/elevation")
async def get_elevation_data(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude")
):
    return await get_point_elevation(lat, lng)

@router.get("/water-bodies")
async def get_water_bodies(
    west: float = Query(73.5),
    south: float = Query(18.0),
    east: float = Query(74.5),
    north: float = Query(19.0)
):
    return await fetch_water_bodies_in_bbox(west, south, east, north)

@router.get("/contours")
async def get_contours(
    west: float = Query(73.8),
    south: float = Query(18.4),
    east: float = Query(74.0),
    north: float = Query(18.6),
    interval: float = Query(20.0)
):
    return generate_contour_geojson([west, south, east, north], 560.0, 920.0, interval)
