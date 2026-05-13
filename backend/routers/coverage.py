"""Module 2: Coverage Gap & Digital Desert Mapping"""
from fastapi import APIRouter
from db import get_db, is_connected
from mock_data import mock_state_coverage, mock_digital_deserts, mock_opi_scores

router = APIRouter()


@router.get("/state-coverage")
async def state_coverage():
    if not is_connected():
        return mock_state_coverage()
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": "$state",
                        "total_pincodes": {"$addToSet": "$pincode"},
                        "total_enrollments": {"$sum": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}}}},
            {"$project": {"_id": 0, "state": "$_id",
                          "total_pincodes": {"$size": "$total_pincodes"},
                          "total_enrollments": 1,
                          "avg_per_pincode": {"$divide": ["$total_enrollments", {"$size": "$total_pincodes"}]}}},
            {"$sort": {"avg_per_pincode": -1}}
        ]).to_list(60)
        return results
    except Exception:
        return mock_state_coverage()


@router.get("/digital-deserts")
async def digital_deserts():
    if not is_connected():
        return mock_digital_deserts()
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": {"state": "$state", "district": "$district", "pincode": "$pincode"},
                        "total": {"$sum": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}}}},
            {"$match": {"total": {"$lt": 200}}},
            {"$project": {"_id": 0, "state": "$_id.state", "district": "$_id.district",
                          "pincode": "$_id.pincode", "total_enrollments": "$total"}},
            {"$sort": {"total_enrollments": 1}}, {"$limit": 50}
        ]).to_list(50)
        return results
    except Exception:
        return mock_digital_deserts()


@router.get("/opi-scores")
async def opi_scores():
    if not is_connected():
        return mock_opi_scores()
    db = get_db()
    try:
        # Compute simplified OPI from enrollment density per district
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": {"state": "$state", "district": "$district"},
                        "total": {"$sum": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}},
                        "pincodes": {"$addToSet": "$pincode"},
                        "youth": {"$sum": "$age_5_17"}}},
            {"$project": {"_id": 0, "state": "$_id.state", "district": "$_id.district",
                          "coverage_gap": {"$cond": [{"$gt": ["$total", 0]},
                                                      {"$divide": [1, {"$log": [{"$add": ["$total", 1]}, 10]}]},
                                                      1]},
                          "youth_score": {"$divide": ["$youth", {"$max": ["$total", 1]}]},
                          "pincode_count": {"$size": "$pincodes"}}},
            {"$addFields": {"opi_score": {"$min": [1.0, {"$add": [
                {"$multiply": ["$coverage_gap", 0.35]},
                {"$multiply": ["$youth_score", 0.20]},
                0.45
            ]}]}}},
            {"$sort": {"opi_score": -1}}, {"$limit": 50}
        ]).to_list(50)
        return results
    except Exception:
        return mock_opi_scores()
