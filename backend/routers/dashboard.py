"""Module 5: Real-Time Aadhaar Operations Dashboard"""
from fastapi import APIRouter, Query
from db import get_db, is_connected
from mock_data import (mock_dashboard_kpis, mock_enrollment_trend,
                       mock_state_summary)
from datetime import datetime

router = APIRouter()


@router.get("/kpis")
async def get_kpis():
    if not is_connected():
        return mock_dashboard_kpis()
    db = get_db()
    try:
        enroll_result = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": None, "total_0_5": {"$sum": "$age_0_5"},
                        "total_5_17": {"$sum": "$age_5_17"},
                        "total_18_plus": {"$sum": "$age_18_greater"},
                        "record_count": {"$sum": 1}}}
        ]).to_list(1)
        bio_result = await db.Aadhar_Biometric_data.aggregate([
            {"$group": {"_id": None, "total_bio_5_17": {"$sum": "$bio_age_5_17"},
                        "total_bio_17_plus": {"$sum": "$bio_age_17_"},
                        "total_demo_5_17": {"$sum": "$demo_age_5_17"},
                        "total_demo_17_plus": {"$sum": "$demo_age_17_"}}}
        ]).to_list(1)
        demo_result = await db.Aadhar_Demographic_data.aggregate([
            {"$group": {"_id": None, "total_demo_5_17": {"$sum": "$demo_age_5_17"},
                        "total_demo_17_plus": {"$sum": "$demo_age_17_"}}}
        ]).to_list(1)
        enroll = enroll_result[0] if enroll_result else {}
        bio = bio_result[0] if bio_result else {}
        demo = demo_result[0] if demo_result else {}
        total_enrollments = enroll.get("total_0_5", 0) + enroll.get("total_5_17", 0) + enroll.get("total_18_plus", 0)
        return {
            "total_enrollments": total_enrollments,
            "total_biometric_updates": bio.get("total_bio_5_17", 0) + bio.get("total_bio_17_plus", 0),
            "total_demographic_updates": demo.get("total_demo_5_17", 0) + demo.get("total_demo_17_plus", 0),
            "enrollment_records": enroll.get("record_count", 0),
            "enrollment_by_age": {"age_0_5": enroll.get("total_0_5", 0),
                                   "age_5_17": enroll.get("total_5_17", 0),
                                   "age_18_plus": enroll.get("total_18_plus", 0)},
            "computed_at": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {**mock_dashboard_kpis(), "_error": str(e)}


@router.get("/enrollment-trend")
async def enrollment_trend():
    if not is_connected():
        return mock_enrollment_trend()
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": "$date",
                        "total": {"$sum": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}},
                        "children": {"$sum": "$age_0_5"},
                        "youth": {"$sum": "$age_5_17"},
                        "adults": {"$sum": "$age_18_greater"}}},
            {"$sort": {"_id": 1}}, {"$limit": 60}
        ]).to_list(60)
        return [{"date": r["_id"], "total": r["total"], "children": r["children"],
                 "youth": r["youth"], "adults": r["adults"]} for r in results]
    except Exception:
        return mock_enrollment_trend()


@router.get("/state-summary")
async def state_summary():
    if not is_connected():
        return mock_state_summary()
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": "$state",
                        "total_enrollments": {"$sum": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}},
                        "districts": {"$addToSet": "$district"}, "records": {"$sum": 1}}},
            {"$project": {"_id": 0, "state": "$_id", "total_enrollments": 1,
                          "district_count": {"$size": "$districts"}, "records": 1}},
            {"$sort": {"total_enrollments": -1}}
        ]).to_list(60)
        return results
    except Exception:
        return mock_state_summary()


@router.get("/district-ranking")
async def district_ranking(state: str = Query(None), limit: int = Query(20, le=100)):
    if not is_connected():
        from mock_data import DISTRICTS, STATES
        import random
        results = []
        for st in ([state] if state else STATES[:5]):
            for dist in (DISTRICTS.get(st) or ["Unknown"])[:4]:
                tot = random.randint(50000, 2000000)
                results.append({"state": st, "district": dist, "total": tot,
                                 "children": int(tot * 0.1), "youth": int(tot * 0.2),
                                 "adults": int(tot * 0.7)})
        return sorted(results, key=lambda x: x["total"], reverse=True)[:limit]
    db = get_db()
    try:
        match = {"$match": {"state": state}} if state else {"$match": {}}
        results = await db.Aadhar_enrolment_data.aggregate([
            match,
            {"$group": {"_id": {"state": "$state", "district": "$district"},
                        "total": {"$sum": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}},
                        "children": {"$sum": "$age_0_5"}, "youth": {"$sum": "$age_5_17"},
                        "adults": {"$sum": "$age_18_greater"}}},
            {"$project": {"_id": 0, "state": "$_id.state", "district": "$_id.district",
                          "total": 1, "children": 1, "youth": 1, "adults": 1}},
            {"$sort": {"total": -1}}, {"$limit": limit}
        ]).to_list(limit)
        return results
    except Exception:
        return []
