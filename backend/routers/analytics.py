"""Modules 9-11: Advanced Analytics, Multi-Level Analysis, External Data Integration"""
from fastapi import APIRouter
from db import get_db, is_connected
from mock_data import (mock_enrollment_anomalies, mock_biometric_anomalies,
                       mock_national_overview, mock_data_sources, STATES, DISTRICTS)
import random

router = APIRouter()


@router.get("/anomalies/enrollment")
async def enrollment_anomalies():
    if not is_connected():
        return mock_enrollment_anomalies()
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": {"state": "$state", "district": "$district"},
                        "daily_totals": {"$push": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}}}},
            {"$project": {"_id": 0, "state": "$_id.state", "district": "$_id.district",
                          "mean": {"$avg": "$daily_totals"},
                          "std_dev": {"$stdDevPop": "$daily_totals"}}},
            {"$addFields": {"coefficient_of_variation": {"$cond": [
                {"$gt": ["$mean", 0]},
                {"$divide": ["$std_dev", "$mean"]}, 0]}}},
            {"$match": {"coefficient_of_variation": {"$gte": 1.0}}},
            {"$addFields": {"severity": {"$switch": {"branches": [
                {"case": {"$gte": ["$coefficient_of_variation", 2.0]}, "then": "CRITICAL"},
                {"case": {"$gte": ["$coefficient_of_variation", 1.5]}, "then": "HIGH"},
            ], "default": "MEDIUM"}}}},
            {"$sort": {"coefficient_of_variation": -1}}, {"$limit": 30}
        ]).to_list(30)
        for r in results:
            r["coefficient_of_variation"] = round(r.get("coefficient_of_variation", 0), 2)
        return {"anomaly_count": len(results), "anomalies": results}
    except Exception:
        return mock_enrollment_anomalies()


@router.get("/anomalies/biometric")
async def biometric_anomalies():
    if not is_connected():
        return mock_biometric_anomalies()
    db = get_db()
    try:
        results = await db.Aadhar_Biometric_data.aggregate([
            {"$group": {"_id": {"state": "$state", "district": "$district"},
                        "vals": {"$push": {"$add": ["$bio_age_5_17", "$bio_age_17_"]}}}},
            {"$project": {"_id": 0, "state": "$_id.state", "district": "$_id.district",
                          "mean": {"$avg": "$vals"}, "std_dev": {"$stdDevPop": "$vals"}}},
            {"$addFields": {"cv": {"$cond": [{"$gt": ["$mean", 0]},
                                             {"$divide": ["$std_dev", "$mean"]}, 0]}}},
            {"$match": {"cv": {"$gte": 1.0}}},
            {"$addFields": {"severity": {"$switch": {"branches": [
                {"case": {"$gte": ["$cv", 2.0]}, "then": "CRITICAL"},
                {"case": {"$gte": ["$cv", 1.5]}, "then": "HIGH"},
            ], "default": "MEDIUM"}}}},
            {"$sort": {"cv": -1}}, {"$limit": 30}
        ]).to_list(30)
        for r in results:
            r["cv"] = round(r.get("cv", 0), 2)
        return {"anomaly_count": len(results), "anomalies": results}
    except Exception:
        return mock_biometric_anomalies()


@router.get("/multilevel/national")
async def national_overview():
    if not is_connected():
        return mock_national_overview()
    db = get_db()
    try:
        enroll = await db.Aadhar_enrolment_data.aggregate([
            {"$group": {"_id": None,
                        "total_enrollments": {"$sum": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}},
                        "states": {"$addToSet": "$state"},
                        "districts": {"$addToSet": "$district"},
                        "pincodes": {"$addToSet": "$pincode"}}},
            {"$project": {"_id": 0, "total_enrollments": 1,
                          "state_count": {"$size": "$states"},
                          "district_count": {"$size": "$districts"},
                          "pincode_count": {"$size": "$pincodes"}}}
        ]).to_list(1)
        return {"level": "NATIONAL", "enrollment": enroll[0] if enroll else {}}
    except Exception:
        return mock_national_overview()


@router.get("/multilevel/state/{state_name}")
async def state_drill_down(state_name: str):
    if not is_connected():
        dists = DISTRICTS.get(state_name, ["Unknown"])
        return {"level": "STATE", "state": state_name,
                "districts": [{"district": d, "total_enrollments": random.randint(100000, 5000000),
                                "pincode_count": random.randint(10, 80)} for d in dists]}
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$match": {"state": state_name}},
            {"$group": {"_id": "$district",
                        "total": {"$sum": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}},
                        "pincodes": {"$addToSet": "$pincode"}}},
            {"$project": {"_id": 0, "district": "$_id", "total_enrollments": "$total",
                          "pincode_count": {"$size": "$pincodes"}}},
            {"$sort": {"total_enrollments": -1}}
        ]).to_list(50)
        return {"level": "STATE", "state": state_name, "districts": results}
    except Exception:
        return {"level": "STATE", "state": state_name, "districts": []}


@router.get("/multilevel/district/{state_name}/{district_name}")
async def district_drill_down(state_name: str, district_name: str):
    if not is_connected():
        return {"level": "DISTRICT", "state": state_name, "district": district_name,
                "pincodes": [{"pincode": str(random.randint(100000, 999999)),
                              "total_enrollments": random.randint(1000, 50000)} for _ in range(10)]}
    db = get_db()
    try:
        results = await db.Aadhar_enrolment_data.aggregate([
            {"$match": {"state": state_name, "district": district_name}},
            {"$group": {"_id": "$pincode",
                        "total": {"$sum": {"$add": ["$age_0_5", "$age_5_17", "$age_18_greater"]}}}},
            {"$project": {"_id": 0, "pincode": "$_id", "total_enrollments": "$total"}},
            {"$sort": {"total_enrollments": -1}}, {"$limit": 50}
        ]).to_list(50)
        return {"level": "DISTRICT", "state": state_name, "district": district_name, "pincodes": results}
    except Exception:
        return {"level": "DISTRICT", "state": state_name, "district": district_name, "pincodes": []}


@router.get("/data-sources")
async def data_sources():
    if not is_connected():
        return mock_data_sources()
    db = get_db()
    try:
        sources = []
        for coll_name in ["Aadhar_enrolment_data", "Aadhar_Biometric_data", "Aadhar_Demographic_data"]:
            count = await db[coll_name].count_documents({})
            sources.append({"source": coll_name, "status": "ACTIVE", "records": count})
        sources.extend([
            {"source": "Census 2011", "status": "STATIC", "records": 640867},
            {"source": "Weather API", "status": "PENDING", "records": 0},
        ])
        return sources
    except Exception:
        return mock_data_sources()
