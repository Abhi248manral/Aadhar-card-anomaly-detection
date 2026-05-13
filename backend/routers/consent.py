"""Module 6: Consent Locker System (Privacy Layer)"""
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from db import get_db, is_connected
from mock_data import mock_consent_stats, mock_consent_history

router = APIRouter()

# In-memory store for mock mode
_mock_consents = []


class ConsentGrant(BaseModel):
    aadhaar_id_hash: str
    requester_id: str
    data_scope: List[str]
    expires_in_days: int = 30


class ConsentVerify(BaseModel):
    consent_id: str
    requester_id: str


@router.post("/grant")
async def grant_consent(body: ConsentGrant):
    consent_id = f"CONSENT_{uuid.uuid4().hex[:8].upper()}"
    now = datetime.utcnow()
    record = {
        "consent_id": consent_id,
        "aadhaar_id_hash": body.aadhaar_id_hash,
        "requester_id": body.requester_id,
        "data_scope": body.data_scope,
        "granted_at": now.isoformat(),
        "expires_at": (now + timedelta(days=body.expires_in_days)).isoformat(),
        "revoked_at": None,
        "status": "ACTIVE",
    }
    if not is_connected():
        _mock_consents.append(record)
        return record
    db = get_db()
    try:
        await db.consent_records.insert_one(record.copy())
        await db.consent_audit.insert_one({
            "consent_id": consent_id, "action": "GRANT",
            "aadhaar_id_hash": body.aadhaar_id_hash,
            "requester_id": body.requester_id, "timestamp": now.isoformat()
        })
        return {k: v for k, v in record.items() if k != "_id"}
    except Exception:
        _mock_consents.append(record)
        return record


@router.delete("/{consent_id}")
async def revoke_consent(consent_id: str):
    now = datetime.utcnow()
    if not is_connected():
        for c in _mock_consents:
            if c["consent_id"] == consent_id:
                c["status"] = "REVOKED"
                c["revoked_at"] = now.isoformat()
                return {"message": "Consent revoked", "consent_id": consent_id}
        raise HTTPException(status_code=404, detail="Consent not found")
    db = get_db()
    try:
        result = await db.consent_records.update_one(
            {"consent_id": consent_id},
            {"$set": {"status": "REVOKED", "revoked_at": now.isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Consent not found")
        await db.consent_audit.insert_one({
            "consent_id": consent_id, "action": "REVOKE", "timestamp": now.isoformat()
        })
        return {"message": "Consent revoked", "consent_id": consent_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{aadhaar_id_hash}")
async def consent_history(aadhaar_id_hash: str):
    if not is_connected():
        stored = [c for c in _mock_consents if c["aadhaar_id_hash"] == aadhaar_id_hash]
        return stored if stored else mock_consent_history(aadhaar_id_hash)
    db = get_db()
    try:
        records = await db.consent_records.find(
            {"aadhaar_id_hash": aadhaar_id_hash}
        ).sort("granted_at", -1).to_list(50)
        for r in records:
            r["_id"] = str(r["_id"])
        return records
    except Exception:
        return mock_consent_history(aadhaar_id_hash)


@router.post("/verify")
async def verify_consent(body: ConsentVerify):
    if not is_connected():
        for c in _mock_consents:
            if c["consent_id"] == body.consent_id and c["requester_id"] == body.requester_id:
                return {"has_consent": c["status"] == "ACTIVE", "status": c["status"]}
        return {"has_consent": False, "status": "NOT_FOUND"}
    db = get_db()
    try:
        record = await db.consent_records.find_one(
            {"consent_id": body.consent_id, "requester_id": body.requester_id})
        if not record:
            return {"has_consent": False, "status": "NOT_FOUND"}
        now = datetime.utcnow()
        if record["status"] == "ACTIVE" and datetime.fromisoformat(record["expires_at"]) > now:
            return {"has_consent": True, "status": "ACTIVE", "data_scope": record["data_scope"]}
        return {"has_consent": False, "status": record["status"]}
    except Exception:
        return {"has_consent": False, "status": "ERROR"}


@router.get("/stats")
async def consent_stats():
    if not is_connected():
        if _mock_consents:
            active = sum(1 for c in _mock_consents if c["status"] == "ACTIVE")
            revoked = sum(1 for c in _mock_consents if c["status"] == "REVOKED")
            expired = sum(1 for c in _mock_consents if c["status"] == "EXPIRED")
            return {"total_consents": len(_mock_consents), "active": active,
                    "revoked": revoked, "expired": expired, "_mock": True}
        return mock_consent_stats()
    db = get_db()
    try:
        total = await db.consent_records.count_documents({})
        active = await db.consent_records.count_documents({"status": "ACTIVE"})
        revoked = await db.consent_records.count_documents({"status": "REVOKED"})
        expired = await db.consent_records.count_documents({"status": "EXPIRED"})
        return {"total_consents": total, "active": active, "revoked": revoked, "expired": expired}
    except Exception:
        return mock_consent_stats()
