"""
GeoJSON standards and feature collection builders for JalDrishti
"""
from typing import Dict, Any, List, Optional

def create_feature(
    geometry_type: str,
    coordinates: Any,
    properties: Dict[str, Any],
    feature_id: Optional[str] = None
) -> Dict[str, Any]:
    feat = {
        "type": "Feature",
        "geometry": {
            "type": geometry_type,
            "coordinates": coordinates,
        },
        "properties": properties,
    }
    if feature_id:
        feat["id"] = feature_id
    return feat

def create_feature_collection(
    features: List[Dict[str, Any]],
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    fc = {
        "type": "FeatureCollection",
        "features": features,
    }
    if metadata:
        fc["metadata"] = metadata
    return fc
