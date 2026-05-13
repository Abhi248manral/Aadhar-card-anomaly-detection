"""Module 4: Duplicate Detection & Data Quality"""
from fastapi import APIRouter
from db import get_db, is_connected
from mock_data import mock_quality_score, mock_duplicate_pincodes, mock_inconsistencies

router = APIRouter()


@router.get("/quality-score")
async def quality_score():
    if not is_connected():
        return mock_quality_score()
    db = get_db()
    try:
        total = await db.Aadhar_enrolment_data.count_documents({})
        zero = await db.Aadhar_enrolment_data.count_documents(
            {"age_0_5": 0, "age_5_17": 0, "age_18_greater": 0})
        clean = total - zero
        score = round((clean / total) * 100, 1) if total > 0 else 0
        return {"quality_score": score, "total_records": total, "clean_records": clean}
    except Exception:
        return mock_quality_score()


@router.get("/duplicate-pincodes")
async def duplicate_pincodes():
    if not is_connected():
        return mock_duplicate_pincodes()
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": "$pincode",
                        "districts": {"$addToSet": "$district"},
                        "states": {"$addToSet": "$state"},
                        "record_count": {"$sum": 1}}},
            {"$match": {"$expr": {"$gt": [{"$size": "$districts"}, 1]}}},
            {"$project": {"_id": 0, "pincode": "$_id",
                          "districts": 1, "district_count": {"$size": "$districts"},
                          "record_count": 1}},
            {"$sort": {"district_count": -1}}, {"$limit": 30}
        ]).to_list(30)
        return results
    except Exception:
        return mock_duplicate_pincodes()


@router.get("/inconsistencies")
async def inconsistencies():
    if not is_connected():
        return mock_inconsistencies()
    db = get_db()
    try:
        enroll = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": {"state": "$state", "district": "$district"},
                        "enroll_total": {"$sum": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}}}}
        ]).to_list(500)
        bio = await db.Aadhar_Biometric_data.aggregate([
            {"$group": {"_id": {"state": "$state", "district": "$district"},
                        "bio_total": {"$sum": {"$add": ["$bio_age_5_17", "$bio_age_17_"]}},
                        "demo_total": {"$sum": {"$add": ["$demo_age_5_17", "$demo_age_17_"]}}}}
        ]).to_list(500)
        bio_map = {(b["_id"]["state"], b["_id"]["district"]): b for b in bio}
        results = []
        for e in enroll:
            key = (e["_id"]["state"], e["_id"]["district"])
            if key in bio_map:
                b = bio_map[key]
                et = e["enroll_total"]
                bt = b["bio_total"] + b["demo_total"]
                ratio = abs(et - bt) / max(et, bt, 1)
                if ratio > 0.15:
                    results.append({
                        "state": e["_id"]["state"], "district": e["_id"]["district"],
                        "bio_total": b["bio_total"], "demo_total": b["demo_total"],
                        "deviation_ratio": round(ratio, 3)
                    })
        results.sort(key=lambda x: x["deviation_ratio"], reverse=True)
        return results[:30]
    except Exception:
        return mock_inconsistencies()
