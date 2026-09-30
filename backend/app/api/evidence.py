"""
Geo-Tagged Evidence and Field Observations API Router
"""
from fastapi import APIRouter, Query, HTTPException, UploadFile, File, Form
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/evidence", tags=["Evidence"])

EVIDENCE_RECORDS = [
    {
        "id": "EV-MH-001",
        "file_name": "check_dam_masonry_spillway.jpg",
        "watershed_id": "WS-MH-PUN-001",
        "intervention_id": "INT-MH-001",
        "latitude": 18.5220,
        "longitude": 73.8580,
        "captured_at": "2025-07-10T11:30:00Z",
        "observation_type": "Water Structure",
        "verification_status": "VERIFIED",
        "gps_validation": "VALID",
        "description": "Masonry check dam with full water retention following monsoon inflow.",
        "storage_path": "evidence/check_dam_masonry_spillway.jpg",
    },
    {
        "id": "EV-MH-002",
        "file_name": "agroforestry_ridge_plantation.jpg",
        "watershed_id": "WS-MH-PUN-001",
        "intervention_id": "INT-MH-002",
        "latitude": 18.5245,
        "longitude": 73.8610,
        "captured_at": "2025-08-14T09:15:00Z",
        "observation_type": "Vegetation",
        "verification_status": "VERIFIED",
        "gps_validation": "VALID",
        "description": "Horticultural and silvi-pasture trees established along continuous contour trenches.",
        "storage_path": "evidence/agroforestry_ridge_plantation.jpg",
    }
]

@router.get("")
async def list_evidence(watershed_id: Optional[str] = Query(None)):
    if watershed_id:
        items = [e for e in EVIDENCE_RECORDS if e["watershed_id"] == watershed_id]
    else:
        items = EVIDENCE_RECORDS
    return {"count": len(items), "evidence": items}

@router.get("/{evidence_id}")
async def get_evidence_detail(evidence_id: str):
    found = next((e for e in EVIDENCE_RECORDS if e["id"] == evidence_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="Evidence observation not found")
    return found

@router.post("/upload")
async def upload_geo_tagged_evidence(
    file: UploadFile = File(...),
    watershed_id: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    captured_date: str = Form(...),
    observation_type: str = Form("Water Structure"),
    description: Optional[str] = Form(""),
    intervention_id: Optional[str] = Form(None)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image (JPEG, PNG, WebP)")
        
    ev_id = f"EV-{uuid.uuid4().hex[:8].upper()}"
    new_record = {
        "id": ev_id,
        "file_name": file.filename,
        "watershed_id": watershed_id,
        "intervention_id": intervention_id,
        "latitude": latitude,
        "longitude": longitude,
        "captured_at": f"{captured_date}T00:00:00Z",
        "observation_type": observation_type,
        "verification_status": "VERIFIED",
        "gps_validation": "VALID",
        "description": description,
        "storage_path": f"uploads/{file.filename}",
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    EVIDENCE_RECORDS.insert(0, new_record)
    return {"success": True, "evidence_id": ev_id, "record": new_record}
