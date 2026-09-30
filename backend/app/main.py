"""
JalDrishti SIH26015 FastAPI Application
Real-World Geospatial Watershed Monitoring & Evaluation Backend
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from .api.health import router as health_router
from .api.gis import router as gis_router
from .api.satellite import router as satellite_router
from .api.watersheds import router as watersheds_router
from .api.interventions import router as interventions_router
from .api.evidence import router as evidence_router
from .api.weather import router as weather_router
from .api.reports import router as reports_router
from .api.data_sources import router as data_sources_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jaldrishti")

app = FastAPI(
    title="JalDrishti SIH26015 Geospatial API",
    description="Real-world authoritative and open geospatial watershed monitoring, remote sensing (NDVI/NDWI), and temporal change detection platform.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware for seamless local and production frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error at {request.url}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred processing the geospatial dataset."},
    )

# Register all routers
app.include_router(health_router)
app.include_router(gis_router)
app.include_router(satellite_router)
app.include_router(watersheds_router)
app.include_router(interventions_router)
app.include_router(evidence_router)
app.include_router(weather_router)
app.include_router(reports_router)
app.include_router(data_sources_router)

@app.get("/")
async def root():
    return {
        "service": "JalDrishti Geospatial Watershed Intelligence API",
        "docs": "/docs",
        "health": "/api/health",
        "status": "OPERATIONAL",
    }
