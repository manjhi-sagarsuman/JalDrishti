"""
Interventions and Field Works API Router
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import datetime, timezone

router = APIRouter(prefix="/api/interventions", tags=["Interventions"])

INTERVENTIONS_CATALOG = [
    {
        "id": "INT-MH-001",
        "code": "CD-01",
        "watershed_id": "WS-MH-PUN-001",
        "name": "Earthen Nala Bund (ENB) #1",
        "type": "Check Dam / Nala Bund",
        "coordinates": [73.8580, 18.5220],
        "status": "COMPLETED",
        "completion_date": "2025-06-12",
        "cost_inr": 450000,
        "beneficiaries": 140,
        "source": "State Watershed Development Department",
    },
    {
        "id": "INT-MH-002",
        "code": "CCT-04",
        "watershed_id": "WS-MH-PUN-001",
        "name": "Continuous Contour Trenching (CCT)",
        "type": "Contour Trenches",
        "coordinates": [73.8610, 18.5245],
        "status": "COMPLETED",
        "completion_date": "2024-11-20",
        "cost_inr": 280000,
        "beneficiaries": 95,
        "source": "State Watershed Development Department",
    },
    {
        "id": "INT-MH-003",
        "code": "FP-02",
        "watershed_id": "WS-MH-AHM-002",
        "name": "Farm Pond Community Recharge",
        "type": "Farm Pond / Water Harvesting",
        "coordinates": [74.3510, 19.3970],
        "status": "COMPLETED",
        "completion_date": "2025-05-18",
        "cost_inr": 185000,
        "beneficiaries": 60,
        "source": "District Rural Development Agency (DRDA)",
    }
]

@router.get("")
async def list_interventions(watershed_id: Optional[str] = Query(None)):
    if watershed_id:
        items = [i for i in INTERVENTIONS_CATALOG if i["watershed_id"] == watershed_id]
    else:
        items = INTERVENTIONS_CATALOG
    return {"count": len(items), "interventions": items}

@router.get("/{intervention_id}")
async def get_intervention_detail(intervention_id: str):
    found = next((i for i in INTERVENTIONS_CATALOG if i["id"] == intervention_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="Intervention record not found")
    return found
