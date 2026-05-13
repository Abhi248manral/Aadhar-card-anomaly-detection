"""Module 3: Biometric Update Prediction System"""
from fastapi import APIRouter
from db import get_db, is_connected
from mock_data import mock_biometric_summary, mock_cbgi, mock_biometric_trend

router = APIRouter()


@router.get("/summary")
async def biometric_summary():
    if not is_connected():
        return mock_biometric_summary()
    db = get_db()
    try:
        result = await db.Aadhar_Biometric_data.aggregate([
            {"$group": {"_id": None,
                        "total_bio_5_17": {"$sum": "$bio_age_5_17"},
                        "total_bio_17_plus": {"$sum": "$bio_age_17_"},
                        "total_demo_5_17": {"$sum": "$demo_age_5_17"},
                        "total_demo_17_plus": {"$sum": "$demo_age_17_"}}}
        ]).to_list(1)
        return result[0] if result else mock_biometric_summary()
    except Exception:
        return mock_biometric_summary()


@router.get("/cbgi")
async def cbgi_scores():
    """Child Biometric Gap Index per district."""
    if not is_connected():
        return mock_cbgi()
    db = get_db()
    try:
        results = await db.Aadhar_Biometric_data.aggregate([
            {"$group": {"_id": {"state": "$state", "district": "$district"},
                        "bio_youth": {"$sum": "$bio_age_5_17"},
                        "demo_youth": {"$sum": "$demo_age_5_17"}}},
            {"$project": {"_id": 0, "state": "$_id.state", "district": "$_id.district",
                          "bio_youth": 1, "demo_youth": 1,
                          "cbgi": {"$multiply": [
                              {"$cond": [{"$gt": [{"$add": ["$bio_youth", "$demo_youth"]}, 0]},
                                         {"$divide": ["$demo_youth", {"$add": ["$bio_youth", "$demo_youth"]}]},
                                         0]},
                              100]}}},
            {"$addFields": {"risk_level": {"$switch": {"branches": [
                {"case": {"$gte": ["$cbgi", 50]}, "then": "CRITICAL"},
                {"case": {"$gte": ["$cbgi", 30]}, "then": "HIGH"},
                {"case": {"$gte": ["$cbgi", 15]}, "then": "MEDIUM"},
            ], "default": "LOW"}}}},
            {"$sort": {"cbgi": -1}}, {"$limit": 50}
        ]).to_list(50)
        for r in results:
            r["cbgi"] = round(r.get("cbgi", 0), 1)
        return results
    except Exception:
        return mock_cbgi()


@router.get("/trend")
async def biometric_trend():
    if not is_connected():
        return mock_biometric_trend()
    db = get_db()
    try:
        results = await db.Aadhar_Biometric_data.aggregate([
            {"$group": {"_id": "$date",
                        "total_bio": {"$sum": {"$add": ["$bio_age_5_17", "$bio_age_17_"]}},
                        "total_demo": {"$sum": {"$add": ["$demo_age_5_17", "$demo_age_17_"]}}}},
            {"$sort": {"_id": 1}}, {"$limit": 60}
        ]).to_list(60)
        return [{"date": r["_id"], "total_bio": r["total_bio"], "total_demo": r["total_demo"]}
                for r in results]
    except Exception:
        return mock_biometric_trend()


@router.get("/state-breakdown")
async def state_breakdown():
    if not is_connected():
        from mock_data import STATES
        import random
        return [{"state": s, "bio_youth": random.randint(500000, 5000000),
                 "bio_adult": random.randint(1000000, 20000000)} for s in STATES]
    db = get_db()
    try:
        results = await db.Aadhar_Biometric_data.aggregate([
            {"$group": {"_id": "$state",
                        "bio_youth": {"$sum": "$bio_age_5_17"},
                        "bio_adult": {"$sum": "$bio_age_17_"}}},
            {"$project": {"_id": 0, "state": "$_id", "bio_youth": 1, "bio_adult": 1}},
            {"$sort": {"bio_adult": -1}}
        ]).to_list(40)
        return results
    except Exception:
        return []
