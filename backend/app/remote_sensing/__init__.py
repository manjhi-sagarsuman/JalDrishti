"""
JalDrishti Remote Sensing Package
"""
from .ndvi import calculate_ndvi_pixel, classify_ndvi, compute_watershed_ndvi_analytics
from .ndwi import calculate_ndwi_pixel, classify_ndwi, compute_watershed_ndwi_analytics
from .change_detection import perform_temporal_change_detection
from .statistics import calculate_zonal_stats

__all__ = [
    "calculate_ndvi_pixel",
    "classify_ndvi",
    "compute_watershed_ndvi_analytics",
    "calculate_ndwi_pixel",
    "classify_ndwi",
    "compute_watershed_ndwi_analytics",
    "perform_temporal_change_detection",
    "calculate_zonal_stats",
]
