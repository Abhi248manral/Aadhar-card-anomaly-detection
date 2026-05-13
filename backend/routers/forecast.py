"""Module 8: Demand Forecasting & Resource Optimization"""
from fastapi import APIRouter
from db import get_db, is_connected
from mock_data import mock_demand_by_state, mock_resource_plan
import math

router = APIRouter()


@router.get("/demand-by-state")
async def demand_by_state():
    if not is_connected():
        return mock_demand_by_state()
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": "$state",
                        "daily_totals": {"$push": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}}}},
            {"$project": {"_id": 0, "state": "$_id",
                          "avg_daily_load": {"$avg": "$daily_totals"}}},
            {"$addFields": {
                "projected_monthly": {"$multiply": ["$avg_daily_load", 22]},
                "projected_quarterly": {"$multiply": ["$avg_daily_load", 66]}
            }},
            {"$sort": {"projected_monthly": -1}}
        ]).to_list(60)
        for r in results:
            r["avg_daily_load"] = round(r.get("avg_daily_load", 0))
            r["projected_monthly"] = round(r.get("projected_monthly", 0))
            r["projected_quarterly"] = round(r.get("projected_quarterly", 0))
        return results
    except Exception:
        return mock_demand_by_state()


@router.get("/resource-plan")
async def resource_plan():
    if not is_connected():
        return mock_resource_plan()
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": {"state": "$state", "district": "$district"},
                        "daily_totals": {"$push": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}}}},
            {"$project": {"_id": 0, "state": "$_id.state", "district": "$_id.district",
                          "avg_daily_load": {"$avg": "$daily_totals"}}},
            {"$sort": {"avg_daily_load": -1}}, {"$limit": 50}
        ]).to_list(50)
        for r in results:
            avg = round(r.get("avg_daily_load", 0))
            r["avg_daily_load"] = avg
            r["monthly_projected"] = avg * 22
            r["required_staff"] = max(1, math.ceil(avg / 25))
            r["required_devices"] = max(1, math.ceil(avg / 34))
        return results
    except Exception:
        return mock_resource_plan()
