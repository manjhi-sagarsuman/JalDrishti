"""
Data Sources & Authoritative Registry API Router
"""
from fastapi import APIRouter
from ..data_sources.registry import get_all_data_sources, get_data_source

router = APIRouter(prefix="/api/data-sources", tags=["Data Sources"])

@router.get("")
async def list_data_sources():
    return {
        "sources": get_all_data_sources(),
        "policy": "Authoritative Indian Government & Open Geospatial Providers",
    }

@router.get("/{source_id}")
async def get_data_source_detail(source_id: str):
    return get_data_source(source_id)
