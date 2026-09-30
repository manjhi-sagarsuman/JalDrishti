"""
JalDrishti API Routers Package
"""
from .health import router as health_router
from .gis import router as gis_router
from .satellite import router as satellite_router
from .watersheds import router as watersheds_router
from .interventions import router as interventions_router
from .evidence import router as evidence_router
from .weather import router as weather_router
from .reports import router as reports_router
from .data_sources import router as data_sources_router

__all__ = [
    "health_router",
    "gis_router",
    "satellite_router",
    "watersheds_router",
    "interventions_router",
    "evidence_router",
    "weather_router",
    "reports_router",
    "data_sources_router",
]
