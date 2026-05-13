"""Module 7: Migration & Demand Intelligence Engine"""
from fastapi import APIRouter
from db import get_db, is_connected
from mock_data import mock_state_flow, mock_district_migration

router = APIRouter()


@router.get("/state-flow")
async def state_flow():
    if not is_connected():
        return mock_state_flow()
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": "$state",
                        "daily_totals": {"$push": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}},
                        "total_records": {"$sum": 1}}},
            {"$project": {"_id": 0, "state": "$_id",
                          "avg_daily": {"$avg": "$daily_totals"},
                          "std_dev": {"$stdDevPop": "$daily_totals"},
                          "total_records": 1}},
            {"$addFields": {"volatility": {"$cond": [
                {"$gt": ["$avg_daily", 0]},
                {"$divide": ["$std_dev", "$avg_daily"]},
                0
            ]}}},
            {"$addFields": {"flow_indicator": {"$switch": {"branches": [
                {"case": {"$gte": ["$volatility", 3.0]}, "then": "HIGH_INFLOW"},
                {"case": {"$gte": ["$volatility", 1.5]}, "then": "MODERATE_INFLOW"},
            ], "default": "STABLE"}}}},
            {"$sort": {"volatility": -1}}
        ]).to_list(60)
        for r in results:
            r["avg_daily"] = round(r.get("avg_daily", 0))
            r["volatility"] = round(r.get("volatility", 0), 2)
        return results
    except Exception:
        return mock_state_flow()


@router.get("/district-migration")
async def district_migration():
    if not is_connected():
        return mock_district_migration()
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": {"state": "$state", "district": "$district"},
                        "daily_totals": {"$push": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}}}},
            {"$project": {"_id": 0, "state": "$_id.state", "district": "$_id.district",
                          "avg_daily": {"$avg": "$daily_totals"},
                          "std_dev": {"$stdDevPop": "$daily_totals"}}},
            {"$addFields": {"migration_index": {"$cond": [
                {"$gt": ["$avg_daily", 0]},
                {"$multiply": [{"$divide": ["$std_dev", "$avg_daily"]}, 100]},
                0
            ]}}},
            {"$addFields": {"surge_flag": {"$gte": ["$migration_index", 80]}}},
            {"$sort": {"migration_index": -1}}, {"$limit": 50}
        ]).to_list(50)
        for r in results:
            r["avg_daily"] = round(r.get("avg_daily", 0))
            r["migration_index"] = round(r.get("migration_index", 0), 1)
        return results
    except Exception:
        return mock_district_migration()
