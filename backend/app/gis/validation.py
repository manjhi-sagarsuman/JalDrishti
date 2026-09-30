"""
Geographic Coordinate and Bounding Box Validation
Ensures coordinates are valid WGS84 (EPSG:4326) and within Indian Geographic Extent.
"""
from typing import Tuple

# Bounding box of Republic of India
INDIA_BBOX = (68.0, 6.5, 97.5, 37.5)  # (west, south, east, north)

def validate_wgs84_coordinate(latitude: float, longitude: float) -> Tuple[bool, str]:
    if not (-90.0 <= latitude <= 90.0):
        return False, f"Latitude {latitude} is out of valid range [-90, 90]"
    if not (-180.0 <= longitude <= 180.0):
        return False, f"Longitude {longitude} is out of valid range [-180, 180]"
    return True, "Valid WGS84 coordinate"

def is_within_india(latitude: float, longitude: float) -> bool:
    west, south, east, north = INDIA_BBOX
    return (south <= latitude <= north) and (west <= longitude <= east)
