"""
Weather & Meteorological API Router
"""
from fastapi import APIRouter, Query
from ..data_sources.weather import get_watershed_weather

router = APIRouter(prefix="/api/weather", tags=["Weather"])

@router.get("/watershed")
async def get_weather_for_coordinates(
    lat: float = Query(18.5204, description="Latitude"),
    lng: float = Query(73.8567, description="Longitude")
):
    return await get_watershed_weather(lat, lng)
