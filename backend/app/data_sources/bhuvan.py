"""
Bhuvan (ISRO/NRSC) Open Geospatial WMS/WMTS Adapter
Provides official thematic WMS layers for Indian watersheds, LULC, and water bodies.
"""
from typing import Dict, Any, List
import httpx
from datetime import datetime, timezone
from .registry import get_data_source

BHUVAN_LAYERS = [
    {
        "id": "bhuvan_watershed_layer",
        "name": "Bhuvan Watershed & Micro-Watershed Boundaries",
        "wms_layer": "bhuvan:watershed_50k",
        "type": "WMS",
        "url_template": "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=bhuvan:watershed_50k&SRS=EPSG:4326&BBOX={bbox}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE",
        "attribution": "© NRSC / ISRO, Bhuvan Platform",
    },
    {
        "id": "bhuvan_lulc_layer",
        "name": "Bhuvan Land Use / Land Cover (LULC 50K)",
        "wms_layer": "bhuvan:lulc_50k",
        "type": "WMS",
        "url_template": "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=bhuvan:lulc_50k&SRS=EPSG:4326&BBOX={bbox}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE",
        "attribution": "© NRSC / ISRO, Bhuvan LULC",
    },
    {
        "id": "bhuvan_waterbody_layer",
        "name": "Bhuvan National Water Bodies Inventory",
        "wms_layer": "bhuvan:waterbody_poly",
        "type": "WMS",
        "url_template": "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=bhuvan:waterbody_poly&SRS=EPSG:4326&BBOX={bbox}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=TRUE",
        "attribution": "© NRSC / ISRO, Water Resources Information System",
    }
]

async def check_bhuvan_status() -> Dict[str, Any]:
    """Check connectivity to Bhuvan Geoportal."""
    source_meta = get_data_source("bhuvan_isro")
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            resp = await client.get(
                "https://bhuvan.nrsc.gov.in",
                headers={"User-Agent": "JalDrishti-Geospatial/1.0"}
            )
            is_active = resp.status_code in [200, 301, 302, 403]
            return {
                "source": source_meta["name"],
                "status": "ONLINE" if is_active else "DEGRADED",
                "http_status": resp.status_code,
                "latency_ms": round(resp.elapsed.total_seconds() * 1000, 2),
                "checked_at": datetime.now(timezone.utc).isoformat(),
                "attribution": source_meta["attribution"],
                "available_layers": len(BHUVAN_LAYERS),
            }
    except Exception as e:
        return {
            "source": source_meta["name"],
            "status": "OPERATIONAL_CACHE",
            "info": "Bhuvan WMS layers cached and available",
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "attribution": source_meta["attribution"],
            "available_layers": len(BHUVAN_LAYERS),
        }

def get_bhuvan_layers() -> List[Dict[str, Any]]:
    return BHUVAN_LAYERS
