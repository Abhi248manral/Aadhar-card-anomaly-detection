"""Module 1: Fraud Detection & Anomaly Intelligence Engine"""
from fastapi import APIRouter, Query
from db import get_db, is_connected
from mock_data import mock_fraud_anomalies, mock_geo_spikes
from datetime import datetime

router = APIRouter()


@router.get("/alerts")
async def get_fraud_alerts(severity: str = Query(None), limit: int = Query(20, le=100)):
    if not is_connected():
        import random
        severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        alerts = []
        for i in range(min(limit, 15)):
            sev = severity.upper() if severity else random.choice(severities)
            alerts.append({
                "_id": f"alert_{i:04d}", "severity": sev,
                "reason": random.choice(["Z-score spike", "Geo concentration", "Frequency anomaly", "Duplicate pattern"]),
                "district": random.choice(["Lucknow", "Mumbai", "Chennai", "Kolkata", "Jaipur"]),
                "state": random.choice(["Uttar Pradesh", "Maharashtra", "Tamil Nadu", "West Bengal"]),
                "created_at": (datetime.utcnow()).isoformat(),
            })
        return alerts
    db = get_db()
    try:
        filter_q = {}
        if severity:
            filter_q["severity"] = severity.upper()
        alerts = await db.alerts.find(filter_q).sort("created_at", -1).limit(limit).to_list(limit)
        for a in alerts:
            a["_id"] = str(a["_id"])
        return alerts
    except Exception:
        return []


@router.get("/anomaly-districts")
async def anomaly_districts():
    if not is_connected():
        return mock_fraud_anomalies()
    db = get_db()
    try:
        pipeline = [
            {"$group": {"_id": {"state": "$state", "district": "$district"},
                        "daily_totals": {"$push": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}},
                        "count": {"$sum": 1}}},
            {"$project": {"_id": 0, "state": "$_id.state", "district": "$_id.district",
                          "mean": {"$avg": "$daily_totals"}, "std_dev": {"$stdDevPop": "$daily_totals"},
                          "max_val": {"$max": "$daily_totals"}, "count": 1}},
            {"$addFields": {"z_max": {"$cond": [{"$gt": ["$std_dev", 0]},
                                                {"$divide": [{"$subtract": ["$max_val", "$mean"]}, "$std_dev"]}, 0]}}},
            {"$match": {"z_max": {"$gt": 2.5}}},
            {"$sort": {"z_max": -1}}, {"$limit": 30}
        ]
        results = await db.Aadhar_enrolment_data.aggregate(pipeline).to_list(30)
        return {"anomaly_count": len(results), "threshold": 2.5, "districts": results}
    except Exception:
        return mock_fraud_anomalies()


@router.get("/geo-spikes")
async def geo_enrollment_spikes():
    if not is_connected():
        return mock_geo_spikes()
    db = get_db()
    try:
        pipeline = [
            {"$group": {"_id": {"state": "$state", "district": "$district", "pincode": "$pincode"},
                        "total": {"$sum": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}}}},
            {"$sort": {"total": -1}}, {"$limit": 50},
            {"$project": {"_id": 0, "state": "$_id.state", "district": "$_id.district",
                          "pincode": "$_id.pincode", "total_enrollments": "$total",
                          "severity": {"$switch": {"branches": [
                              {"case": {"$gte": ["$total", 5000]}, "then": "CRITICAL"},
                              {"case": {"$gte": ["$total", 2000]}, "then": "HIGH"},
                              {"case": {"$gte": ["$total", 1000]}, "then": "MEDIUM"},
                          ], "default": "LOW"}}}}
        ]
        return await db.Aadhar_enrolment_data.aggregate(pipeline).to_list(50)
    except Exception:
        return mock_geo_spikes()
