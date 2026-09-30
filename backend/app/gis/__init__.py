"""
JalDrishti GIS Package
"""
from .geometry import haversine_distance_km, point_in_bbox, calculate_polygon_area_ha
from .spatial_query import find_nearest_watersheds, find_nearest_water_bodies
from .geojson import create_feature, create_feature_collection
from .validation import validate_wgs84_coordinate, is_within_india, INDIA_BBOX

__all__ = [
    "haversine_distance_km",
    "point_in_bbox",
    "calculate_polygon_area_ha",
    "find_nearest_watersheds",
    "find_nearest_water_bodies",
    "create_feature",
    "create_feature_collection",
    "validate_wgs84_coordinate",
    "is_within_india",
    "INDIA_BBOX",
]
