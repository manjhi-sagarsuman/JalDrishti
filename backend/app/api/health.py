"""
Health Check and Geospatial Data Source Diagnostics Endpoint
"""
from fastapi import APIRouter
from datetime import datetime, timezone
from ..data_sources.registry import get_all_data_sources
from ..data_sources.bhuvan import check_bhuvan_status

router = APIRouter(prefix="/api/health", tags=["Health"])

@router.get("")
async def health_check():
    bhuvan_check = await check_bhuvan_status()
    sources = get_all_data_sources()
    
    return {
        "status": "HEALTHY",
        "service": "JalDrishti Geospatial Watershed Intelligence API",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "registered_sources_count": len(sources),
        "bhuvan_status": bhuvan_check["status"],
        "data_sources": sources,
    }
