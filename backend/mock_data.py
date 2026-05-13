"""
Mock data for AadhaarIntel platform.
Used when MongoDB is unavailable. All data is realistic and India-specific.
Replace with real DB calls by setting MONGODB_URI in .env
"""

from datetime import datetime, timedelta
import random

STATES = [
    "Uttar Pradesh", "Maharashtra", "Bihar", "West Bengal", "Madhya Pradesh",
    "Rajasthan", "Tamil Nadu", "Karnataka", "Gujarat", "Andhra Pradesh",
    "Odisha", "Telangana", "Kerala", "Jharkhand", "Assam", "Punjab",
    "Haryana", "Chhattisgarh", "Delhi", "Uttarakhand"
]

DISTRICTS = {
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi", "Meerut", "Allahabad", "Bareilly"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad"],
    "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
    "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Siliguri", "Asansol"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
    "Karnataka": ["Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain"],
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Kurnool"],
}


def mock_dashboard_kpis():
    return {
        "total_enrollments": 1_387_429_000,
        "total_biometric_updates": 98_340_000,
        "total_demographic_updates": 64_120_000,
        "enrollment_records": 1_006_029,
        "enrollment_by_age": {
            "age_0_5": 142_800_000,
            "age_5_17": 268_400_000,
            "age_18_plus": 976_229_000,
        },
        "computed_at": datetime.utcnow().isoformat(),
        "_mock": True,
    }


def mock_enrollment_trend():
    base_date = datetime(2025, 4, 1)
    trend = []
    for i in range(60):
        date = base_date + timedelta(days=i * 5)
        total = random.randint(2_800_000, 4_200_000)
        youth = int(total * 0.22)
        adults = int(total * 0.70)
        children = total - youth - adults
        trend.append({
            "date": date.strftime("%d-%m-%Y"),
            "total": total,
            "children": children,
            "youth": youth,
            "adults": adults,
        })
    return trend


def mock_state_summary():
    results = []
    for state in STATES:
        base = random.randint(8_000_000, 220_000_000)
        results.append({
            "state": state,
            "total_enrollments": base,
            "district_count": random.randint(12, 75),
            "records": random.randint(8000, 45000),
        })
    return sorted(results, key=lambda x: x["total_enrollments"], reverse=True)


def mock_fraud_anomalies():
    districts = []
    for state in list(STATES)[:10]:
        for dist in (DISTRICTS.get(state) or ["Unknown"])[:3]:
            z = round(random.uniform(2.6, 6.5), 2)
            mean = random.randint(1200, 8000)
            std = random.randint(300, 2000)
            districts.append({
                "state": state,
                "district": dist,
                "z_max": z,
                "mean": float(mean),
                "std_dev": float(std),
                "count": random.randint(30, 200),
            })
    districts.sort(key=lambda x: x["z_max"], reverse=True)
    return {"anomaly_count": len(districts), "threshold": 2.5, "districts": districts[:20]}


def mock_geo_spikes():
    spikes = []
    pincode = 110001
    for state in STATES[:8]:
        for _ in range(3):
            total = random.randint(800, 8500)
            severity = "CRITICAL" if total >= 5000 else "HIGH" if total >= 2000 else "MEDIUM" if total >= 1000 else "LOW"
            spikes.append({
                "pincode": str(pincode),
                "state": state,
                "district": (DISTRICTS.get(state) or ["Unknown"])[0],
                "total_enrollments": total,
                "severity": severity,
            })
            pincode += random.randint(100, 999)
    return sorted(spikes, key=lambda x: x["total_enrollments"], reverse=True)


def mock_state_coverage():
    results = []
    for state in STATES:
        results.append({
            "state": state,
            "total_pincodes": random.randint(200, 2000),
            "total_enrollments": random.randint(5_000_000, 180_000_000),
            "avg_per_pincode": random.randint(1000, 25000),
        })
    return sorted(results, key=lambda x: x["avg_per_pincode"], reverse=True)


def mock_digital_deserts():
    deserts = []
    pincode = 800001
    for state in STATES[10:]:
        for _ in range(4):
            deserts.append({
                "pincode": str(pincode),
                "state": state,
                "district": (DISTRICTS.get(state) or ["Unknown District"])[0],
                "total_enrollments": random.randint(5, 180),
            })
            pincode += random.randint(10, 99)
    return deserts


def mock_opi_scores():
    results = []
    for state in STATES[:10]:
        for dist in (DISTRICTS.get(state) or ["Unknown"])[:4]:
            results.append({
                "state": state,
                "district": dist,
                "opi_score": round(random.uniform(0.4, 0.98), 3),
                "coverage_gap": round(random.uniform(0.1, 0.6), 3),
                "youth_score": round(random.uniform(0.2, 0.9), 3),
            })
    return sorted(results, key=lambda x: x["opi_score"], reverse=True)


def mock_biometric_summary():
    return {
        "total_bio_5_17": 28_400_000,
        "total_bio_17_plus": 69_940_000,
        "total_demo_5_17": 18_200_000,
        "total_demo_17_plus": 45_920_000,
        "_mock": True,
    }


def mock_cbgi():
    results = []
    for state in STATES:
        for dist in (DISTRICTS.get(state) or ["Unknown"])[:3]:
            bio_youth = random.randint(5000, 80000)
            demo_youth = random.randint(3000, 60000)
            cbgi = round((demo_youth / (demo_youth + bio_youth)) * 100, 1) if (demo_youth + bio_youth) > 0 else 0
            risk = "CRITICAL" if cbgi > 50 else "HIGH" if cbgi > 30 else "MEDIUM" if cbgi > 15 else "LOW"
            results.append({
                "state": state,
                "district": dist,
                "bio_youth": bio_youth,
                "demo_youth": demo_youth,
                "cbgi": cbgi,
                "risk_level": risk,
            })
    return sorted(results, key=lambda x: x["cbgi"], reverse=True)


def mock_biometric_trend():
    base_date = datetime(2025, 4, 1)
    trend = []
    for i in range(60):
        date = base_date + timedelta(days=i * 5)
        trend.append({
            "date": date.strftime("%d-%m-%Y"),
            "total_bio": random.randint(400_000, 900_000),
            "total_demo": random.randint(200_000, 600_000),
        })
    return trend


def mock_quality_score():
    return {
        "quality_score": round(random.uniform(95.2, 98.8), 1),
        "total_records": 1_006_029,
        "clean_records": random.randint(970_000, 1_000_000),
        "_mock": True,
    }


def mock_duplicate_pincodes():
    results = []
    pincode = 201001
    for _ in range(20):
        count = random.randint(2, 5)
        state = random.choice(STATES)
        dists = (DISTRICTS.get(state) or ["D1", "D2"])[:count]
        results.append({
            "pincode": str(pincode),
            "districts": dists,
            "district_count": count,
            "record_count": random.randint(count * 3, count * 15),
        })
        pincode += random.randint(50, 500)
    return results


def mock_inconsistencies():
    results = []
    for state in STATES[:8]:
        for dist in (DISTRICTS.get(state) or ["Unknown"])[:2]:
            bio = random.randint(10000, 100000)
            demo = random.randint(8000, 120000)
            ratio = abs(bio - demo) / max(bio, demo)
            results.append({
                "state": state,
                "district": dist,
                "bio_total": bio,
                "demo_total": demo,
                "deviation_ratio": round(ratio, 3),
            })
    return sorted(results, key=lambda x: x["deviation_ratio"], reverse=True)


def mock_consent_stats():
    return {
        "total_consents": 1247,
        "active": 832,
        "revoked": 293,
        "expired": 122,
        "_mock": True,
    }


def mock_consent_history(aadhaar_hash: str):
    scopes_options = [["name", "dob"], ["name", "dob", "address"], ["address", "photo"]]
    return [
        {
            "consent_id": f"CONSENT_{i:04d}",
            "aadhaar_id_hash": aadhaar_hash,
            "requester_id": random.choice(["BANK_SBI", "HDFC_BANK", "UIDAI_TEST", "DEMO_BANK"]),
            "data_scope": random.choice(scopes_options),
            "status": random.choice(["ACTIVE", "ACTIVE", "REVOKED", "EXPIRED"]),
            "granted_at": (datetime.utcnow() - timedelta(days=random.randint(1, 90))).isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(days=random.randint(1, 30))).isoformat(),
        }
        for i in range(5)
    ]


def mock_state_flow():
    results = []
    for state in STATES:
        vol = round(random.uniform(0.2, 5.0), 2)
        flow = "HIGH_INFLOW" if vol >= 3.0 else "MODERATE_INFLOW" if vol >= 1.5 else "STABLE"
        results.append({
            "state": state,
            "volatility": vol,
            "avg_daily": random.randint(5000, 80000),
            "total_records": random.randint(5000, 80000),
            "flow_indicator": flow,
        })
    return sorted(results, key=lambda x: x["volatility"], reverse=True)


def mock_district_migration():
    results = []
    for state in STATES[:12]:
        for dist in (DISTRICTS.get(state) or ["Unknown"])[:4]:
            idx = round(random.uniform(10, 150), 1)
            results.append({
                "state": state,
                "district": dist,
                "migration_index": idx,
                "avg_daily": random.randint(200, 5000),
                "surge_flag": idx > 80,
            })
    return sorted(results, key=lambda x: x["migration_index"], reverse=True)


def mock_demand_by_state():
    results = []
    for state in STATES:
        avg = random.randint(5000, 80000)
        results.append({
            "state": state,
            "avg_daily_load": avg,
            "projected_monthly": avg * 22,
            "projected_quarterly": avg * 66,
        })
    return sorted(results, key=lambda x: x["projected_monthly"], reverse=True)


def mock_resource_plan():
    results = []
    for state in STATES[:12]:
        for dist in (DISTRICTS.get(state) or ["Unknown"])[:3]:
            avg = random.randint(100, 3000)
            results.append({
                "state": state,
                "district": dist,
                "avg_daily_load": avg,
                "monthly_projected": avg * 22,
                "required_staff": max(1, avg // 25),
                "required_devices": max(1, avg // 34),
            })
    return sorted(results, key=lambda x: x["monthly_projected"], reverse=True)


def mock_enrollment_anomalies():
    anomalies = []
    for state in STATES[:10]:
        for dist in (DISTRICTS.get(state) or ["Unknown"])[:3]:
            cv = round(random.uniform(0.8, 2.8), 2)
            sev = "CRITICAL" if cv >= 2.0 else "HIGH" if cv >= 1.5 else "MEDIUM"
            anomalies.append({
                "state": state,
                "district": dist,
                "coefficient_of_variation": cv,
                "severity": sev,
            })
    anomalies.sort(key=lambda x: x["coefficient_of_variation"], reverse=True)
    return {"anomaly_count": len(anomalies), "anomalies": anomalies}


def mock_biometric_anomalies():
    anomalies = []
    for state in STATES[:8]:
        for dist in (DISTRICTS.get(state) or ["Unknown"])[:2]:
            cv = round(random.uniform(0.9, 3.2), 2)
            sev = "CRITICAL" if cv >= 2.0 else "HIGH" if cv >= 1.5 else "MEDIUM"
            anomalies.append({
                "state": state,
                "district": dist,
                "cv": cv,
                "severity": sev,
            })
    anomalies.sort(key=lambda x: x["cv"], reverse=True)
    return {"anomaly_count": len(anomalies), "anomalies": anomalies}


def mock_national_overview():
    return {
        "level": "NATIONAL",
        "enrollment": {
            "total_enrollments": 1_387_429_000,
            "state_count": 36,
            "district_count": 762,
            "pincode_count": 19_135,
        },
        "biometric": {
            "total_bio": 98_340_000,
            "total_demo": 64_120_000,
        },
        "_mock": True,
    }


def mock_data_sources():
    return [
        {"source": "Aadhar_enrolment_data", "status": "ACTIVE", "records": 1_006_029},
        {"source": "Aadhar_Biometric_data", "status": "ACTIVE", "records": 1_013_000},
        {"source": "Aadhar_Demographic_data", "status": "ACTIVE", "records": 1_071_700},
        {"source": "Census 2011", "status": "STATIC", "records": 640_867},
        {"source": "Weather API", "status": "PENDING", "records": 0},
        {"source": "SDG Index", "status": "PENDING", "records": 0},
    ]
