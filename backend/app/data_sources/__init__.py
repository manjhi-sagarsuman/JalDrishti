"""
JalDrishti Data Sources Package
"""
from .registry import DATA_SOURCE_REGISTRY, get_all_data_sources, get_data_source
from .bhuvan import check_bhuvan_status, get_bhuvan_layers
from .satellite import get_satellite_layers, get_available_scenes, get_scene_metadata, get_satellite_tile_url
from .elevation import get_point_elevation, calculate_watershed_terrain_stats, generate_contour_geojson
from .administrative import get_states, get_districts, search_administrative_units
from .osm import fetch_water_bodies_in_bbox
from .weather import get_watershed_weather
from .data_gov import get_data_gov_metadata

__all__ = [
    "DATA_SOURCE_REGISTRY",
    "get_all_data_sources",
    "get_data_source",
    "check_bhuvan_status",
    "get_bhuvan_layers",
    "get_satellite_layers",
    "get_available_scenes",
    "get_scene_metadata",
    "get_satellite_tile_url",
    "get_point_elevation",
    "calculate_watershed_terrain_stats",
    "generate_contour_geojson",
    "get_states",
    "get_districts",
    "search_administrative_units",
    "fetch_water_bodies_in_bbox",
    "get_watershed_weather",
    "get_data_gov_metadata",
]
