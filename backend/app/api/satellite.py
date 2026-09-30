"""
Satellite Remote Sensing API Router
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from ..data_sources.satellite import (
    get_satellite_layers,
    get_available_scenes,
    get_scene_metadata,
    get_satellite_tile_url,
    get_cloud_metadata
)
from ..remote_sensing.ndvi import compute_watershed_ndvi_analytics
from ..remote_sensing.ndwi import compute_watershed_ndwi_analytics
from ..remote_sensing.change_detection import perform_temporal_change_detection

router = APIRouter(prefix="/api/satellite", tags=["Satellite"])

@router.get("/layers")
async def list_satellite_layers():
    return {"layers": get_satellite_layers()}

@router.get("/scenes")
async def list_satellite_scenes(
    west: float = Query(73.5),
    south: float = Query(18.0),
    east: float = Query(74.5),
    north: float = Query(19.0),
    date_start: Optional[str] = Query(None),
    date_end: Optional[str] = Query(None),
    max_cloud: float = Query(30.0)
):
    scenes = await get_available_scenes(west, south, east, north, date_start, date_end, max_cloud)
    return {"count": len(scenes), "scenes": scenes}

@router.get("/scenes/{scene_id}")
async def get_scene_details(scene_id: str):
    meta = get_scene_metadata(scene_id)
    cloud = get_cloud_metadata(scene_id)
    return {**meta, "cloud_assessment": cloud}

@router.get("/ndvi")
async def get_watershed_ndvi(
    watershed_id: Optional[str] = Query(None),
    scene_id: Optional[str] = Query(None)
):
    return compute_watershed_ndvi_analytics(watershed_id=watershed_id, scene_id=scene_id)

@router.get("/ndwi")
async def get_watershed_ndwi(
    watershed_id: Optional[str] = Query(None),
    scene_id: Optional[str] = Query(None),
    watershed_area_ha: float = Query(4500.0)
):
    return compute_watershed_ndwi_analytics(
        watershed_id=watershed_id,
        total_watershed_area_ha=watershed_area_ha,
        scene_id=scene_id
    )

@router.get("/change-detection")
async def get_change_detection(
    watershed_id: str = Query(..., description="Watershed ID"),
    before_date: str = Query("2024-03-15", description="Baseline date (YYYY-MM-DD)"),
    after_date: str = Query("2026-03-15", description="Monitoring date (YYYY-MM-DD)"),
    watershed_area_ha: float = Query(4500.0)
):
    return perform_temporal_change_detection(
        watershed_id=watershed_id,
        before_date=before_date,
        after_date=after_date,
        watershed_area_ha=watershed_area_ha
    )
