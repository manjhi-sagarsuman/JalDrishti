"""
Spatial Querying & Nearby Searches (PostGIS & Geographic indexing)
"""
from typing import List, Dict, Any, Optional
from .geometry import haversine_distance_km

def find_nearest_watersheds(
    latitude: float,
    longitude: float,
    watersheds: List[Dict[str, Any]],
    max_radius_km: float = 100.0,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Finds watersheds within radius and sorts by distance.
    """
    results = []
    for w in watersheds:
        center = w.get("center", [74.5, 18.5])
        w_lon, w_lat = center[0], center[1]
        dist = haversine_distance_km(latitude, longitude, w_lat, w_lon)
        if dist <= max_radius_km:
            results.append({
                **w,
                "distance_km": dist,
                "bearing": "NE" if (w_lat > latitude and w_lon > longitude) else "SE" if (w_lat < latitude and w_lon > longitude) else "NW" if (w_lat > latitude) else "SW",
            })
            
    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]

def find_nearest_water_bodies(
    latitude: float,
    longitude: float,
    water_features: List[Dict[str, Any]],
    max_radius_km: float = 50.0,
    limit: int = 5
) -> List[Dict[str, Any]]:
    results = []
    for feat in water_features:
        geom = feat.get("geometry", {})
        coords = geom.get("coordinates", [])
        props = feat.get("properties", {})
        
        # Extract representative point
        p_lat, p_lon = latitude, longitude
        if geom.get("type") == "Point" and len(coords) == 2:
            p_lon, p_lat = coords[0], coords[1]
        elif geom.get("type") == "LineString" and len(coords) > 0:
            mid = len(coords) // 2
            p_lon, p_lat = coords[mid][0], coords[mid][1]
        elif geom.get("type") == "Polygon" and len(coords) > 0 and len(coords[0]) > 0:
            p_lon, p_lat = coords[0][0][0], coords[0][0][1]

        dist = haversine_distance_km(latitude, longitude, p_lat, p_lon)
        if dist <= max_radius_km:
            results.append({
                "id": props.get("id"),
                "name": props.get("name", "Water Body"),
                "water_type": props.get("water_type", "surface_water"),
                "distance_km": dist,
                "coordinates": [p_lon, p_lat],
                "source": props.get("source", "OpenStreetMap / Bhuvan"),
            })
            
    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]
