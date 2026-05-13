"""
AadhaarIntel — Data Store Router
Handles saving form/user data to MongoDB Atlas securely.
Uses MONGODB_URI from environment variables — no hardcoded credentials.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import logging

from db import get_db, is_connected

router = APIRouter()
logger = logging.getLogger("aadhaarintel.data_store")


# ============================================
# Pydantic Models
# ============================================

class ConsentSubmission(BaseModel):
    """Consent grant request from the frontend form"""
    aadhaar_hash: str = Field(..., min_length=4, max_length=128, description="SHA256 hash of Aadhaar ID")
    requester_id: str = Field(..., min_length=2, max_length=64, description="Requester org identifier")
    data_scopes: List[str] = Field(default=["name", "dob", "address"], description="Requested data scopes")
    expiry_days: int = Field(default=30, ge=1, le=365, description="Days until consent expires")


class FeedbackSubmission(BaseModel):
    """User feedback or bug report"""
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=200)
    category: str = Field(default="general", max_length=50)
    message: str = Field(..., min_length=5, max_length=2000)
    page: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(default="en", max_length=5)


class AlertAcknowledgement(BaseModel):
    """Alert acknowledgement from dashboard"""
    alert_id: str = Field(..., max_length=64)
    acknowledged_by: str = Field(default="dashboard_user", max_length=100)
    notes: Optional[str] = Field(None, max_length=500)


class SearchQuery(BaseModel):
    """Search query log"""
    query: str = Field(..., min_length=1, max_length=200)
    page_context: Optional[str] = Field(None, max_length=50)
    language: Optional[str] = Field(default="en", max_length=5)


# ============================================
# Endpoints
# ============================================

@router.post("/consent/submit", status_code=status.HTTP_201_CREATED)
async def submit_consent(data: ConsentSubmission):
    """Save consent grant to MongoDB Atlas"""
    db = get_db()
    if not db:
        # Fallback: acknowledge even without DB
        logger.warning("No DB connection — consent saved in memory only")
        return {
            "status": "accepted",
            "message": "Consent recorded (mock mode - no database connected)",
            "consent_id": f"MOCK_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "db_saved": False
        }

    doc = {
        "aadhaar_hash": data.aadhaar_hash,
        "requester_id": data.requester_id,
        "data_scopes": data.data_scopes,
        "expiry_days": data.expiry_days,
        "status": "ACTIVE",
        "granted_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = await db["consent_records"].insert_one(doc)
        return {
            "status": "created",
            "message": "Consent saved to MongoDB Atlas",
            "consent_id": str(result.inserted_id),
            "db_saved": True
        }
    except Exception as e:
        logger.error(f"Failed to save consent: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/feedback/submit", status_code=status.HTTP_201_CREATED)
async def submit_feedback(data: FeedbackSubmission):
    """Save user feedback to MongoDB Atlas"""
    db = get_db()
    if not db:
        logger.warning("No DB connection — feedback logged only")
        return {
            "status": "accepted",
            "message": "Feedback received (mock mode)",
            "db_saved": False
        }

    doc = {
        "name": data.name,
        "email": data.email,
        "category": data.category,
        "message": data.message,
        "page": data.page,
        "language": data.language,
        "submitted_at": datetime.now(timezone.utc),
    }

    try:
        result = await db["user_feedback"].insert_one(doc)
        return {
            "status": "created",
            "message": "Feedback saved to MongoDB Atlas",
            "feedback_id": str(result.inserted_id),
            "db_saved": True
        }
    except Exception as e:
        logger.error(f"Failed to save feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/alerts/acknowledge", status_code=status.HTTP_200_OK)
async def acknowledge_alert(data: AlertAcknowledgement):
    """Record alert acknowledgement in MongoDB Atlas"""
    db = get_db()
    if not db:
        return {"status": "accepted", "message": "Acknowledged (mock mode)", "db_saved": False}

    doc = {
        "alert_id": data.alert_id,
        "acknowledged_by": data.acknowledged_by,
        "notes": data.notes,
        "acknowledged_at": datetime.now(timezone.utc),
    }

    try:
        result = await db["alert_acknowledgements"].insert_one(doc)
        return {
            "status": "acknowledged",
            "record_id": str(result.inserted_id),
            "db_saved": True
        }
    except Exception as e:
        logger.error(f"Failed to save acknowledgement: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/search/log", status_code=status.HTTP_201_CREATED)
async def log_search(data: SearchQuery):
    """Log search queries for analytics"""
    db = get_db()
    if not db:
        return {"status": "accepted", "db_saved": False}

    doc = {
        "query": data.query,
        "page_context": data.page_context,
        "language": data.language,
        "searched_at": datetime.now(timezone.utc),
    }

    try:
        await db["search_logs"].insert_one(doc)
        return {"status": "logged", "db_saved": True}
    except Exception as e:
        logger.error(f"Failed to log search: {e}")
        return {"status": "accepted", "db_saved": False}


@router.get("/health/db")
async def db_health():
    """Check detailed database health"""
    db = get_db()
    if not db:
        return {
            "connected": False,
            "message": "No MongoDB connection. Set MONGODB_URI in .env file.",
            "collections": []
        }

    try:
        collections = await db.list_collection_names()
        stats = {}
        for coll in collections[:10]:  # Limit to 10 for safety
            count = await db[coll].estimated_document_count()
            stats[coll] = count

        return {
            "connected": True,
            "database": db.name,
            "collections": collections,
            "document_counts": stats
        }
    except Exception as e:
        return {
            "connected": False,
            "message": str(e),
            "collections": []
        }
