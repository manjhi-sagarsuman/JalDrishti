"""
Geospatial Calculations & Geometry Helpers
"""
import math
from typing import List, Tuple, Dict, Any

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two geographic coordinates in kilometers.
    """
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 3)

def point_in_bbox(lat: float, lon: float, bbox: List[float]) -> bool:
    """
    Checks if point [lat, lon] is inside [west, south, east, north].
    """
    west, south, east, north = bbox
    return (south <= lat <= north) and (west <= lon <= east)

def calculate_polygon_area_ha(coordinates: List[List[float]]) -> float:
    """
    Approximates geodesic polygon area in hectares using planar projection for small watershed catchments.
    """
    if len(coordinates) < 3:
        return 0.0
    
    # Shoelace formula in projected meters
    avg_lat = sum(p[1] for p in coordinates) / len(coordinates)
    lat_factor = 111320.0
    lon_factor = 111320.0 * math.cos(math.radians(avg_lat))
    
    area_sqm = 0.0
    j = len(coordinates) - 1
    for i in range(len(coordinates)):
        xi = coordinates[i][0] * lon_factor
        yi = coordinates[i][1] * lat_factor
        xj = coordinates[j][0] * lon_factor
        yj = coordinates[j][1] * lat_factor
        area_sqm += (xj + xi) * (yj - yi)
        j = i
        
    area_sqm = abs(area_sqm) / 2.0
    return round(area_sqm / 10000.0, 2)  # 1 ha = 10,000 sqm
