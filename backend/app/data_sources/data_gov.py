"""
Data.gov.in / OGD Platform India Hydrology Adapter
Provides access points for open government datasets on groundwater, reservoirs, and watershed interventions.
"""
from typing import Dict, Any, List
from datetime import datetime, timezone

DATA_GOV_META = {
    "id": "data_gov_in",
    "name": "Open Government Data (OGD) Platform India (data.gov.in)",
    "agency": "Ministry of Electronics and Information Technology / Ministry of Jal Shakti",
    "url": "https://data.gov.in",
    "attribution": "National Data Sharing and Accessibility Policy (NDSAP) / data.gov.in",
    "data_types": ["Groundwater Levels", "Major Reservoir Storage Levels", "National Watershed Scheme Outlays"],
    "status": "CATALOG_ACTIVE",
}

def get_data_gov_metadata() -> Dict[str, Any]:
    return DATA_GOV_META

def get_groundwater_monitoring_status(district_name: str) -> Dict[str, Any]:
    """
    Returns groundwater telemetry metadata from Central Ground Water Board (CGWB).
    """
    return {
        "district": district_name,
        "agency": "Central Ground Water Board (CGWB) / National Water Informatics Centre (NWIC)",
        "monitoring_frequency": "Pre-Monsoon & Post-Monsoon Wells Network",
        "status": "OPERATIONAL",
        "provenance": "India-WRIS / CGWB Ground Water Year Book",
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
    }
