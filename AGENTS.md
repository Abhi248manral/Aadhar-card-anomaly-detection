# Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This system fixes that mismatch.

---

## Project Overview

**Project Name:** AadhaarIntel — Intelligent, Predictive & Citizen-Controlled Aadhaar Platform
**Hackathon Goal:** Build a full-stack web platform that transforms Aadhaar infrastructure into an AI-driven, fraud-resistant, citizen-empowered system.

This platform addresses 11 problem domains:
1. Fraud Detection & Anomaly Intelligence Engine
2. Coverage Gap & Digital Desert Mapping
3. Biometric Update Prediction System
4. Duplicate Detection & Data Cleaning Engine
5. Real-Time Aadhaar Operations Dashboard
6. Consent Locker System (Privacy Layer)
7. Migration & Demand Intelligence Engine
8. Demand Forecasting & Resource Optimization
9. Advanced Anomaly Detection Layer
10. Multi-Level Data Analysis System
11. External Data Integration Layer

---

## The 3-Layer Architecture

**Layer 1: Directive (What to do)**
- SOPs written in Markdown, live in `directives/`
- Each of the 11 modules has its own directive file
- Define goals, inputs, tools/scripts to use, outputs, and edge cases
- Written as natural language instructions, like you'd give a mid-level engineer

**Layer 2: Orchestration (Decision making)**
- This is you. Your job: intelligent routing.
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- You're the glue between intent and execution — you don't scrape data yourself, you read `directives/ingest_census_data.md` and then run `execution/ingest_census_data.py`
- Route user requests to the correct module directive, chain multi-step flows, and surface anomalies proactively

**Layer 3: Execution (Doing the work)**
- Deterministic Python scripts in `execution/`
- Environment variables, API tokens, DB credentials live in `.env`
- Handle ML inference, data pipelines, API calls, DB reads/writes, file exports
- Reliable, testable, fast. Every script is independently runnable and well-commented.

**Why this works:** If you do everything yourself, errors compound. 90% accuracy per step = 59% success over 5 steps. Push complexity into deterministic code. You focus on decision-making.

---

## The 3-Layer Architecture Applied Per Module

### Module 1 — Fraud Detection & Anomaly Intelligence Engine
| Layer | Location | Purpose |
|---|---|---|
| Directive | `directives/fraud_detection.md` | Rules for what counts as fraud, alert thresholds, ML model inputs |
| Orchestration | You | Decide when to trigger re-training, escalate alerts, request clarifications |
| Execution | `execution/fraud_detection.py` | Run Random Forest / XGBoost / Isolation Forest, emit alerts |

**Directive summary (`directives/fraud_detection.md`):**
- Input: Authentication logs (user_id, timestamp, lat/lon, device_id, biometric_score)
- Detect geo-anomaly: same Aadhaar used in 2 cities > 500km apart within 30 minutes
- Detect frequency spike: > 5 auth attempts in 10 minutes from different devices
- Run Z-score on daily auth volume per district — flag if Z > 2.5
- Run Isolation Forest on combined feature vector (geo, time, biometric_score, device_fingerprint)
- Run XGBoost classifier (trained on labeled fraud/legit dataset) — threshold: 0.75
- Output: `alerts` table row with severity (LOW/MEDIUM/HIGH/CRITICAL), reason, evidence JSON
- Alert must fire within 5 minutes of anomalous event
- Edge case: roaming users (flag but don't auto-block; route to human review queue)
- Edge case: NTP clock skew on enrollment devices (add 5-minute tolerance window)

---

### Module 2 — Coverage Gap & Digital Desert Mapping
| Layer | Location | Purpose |
|---|---|---|
| Directive | `directives/coverage_gap_mapping.md` | OPI formula, heatmap thresholds, data sources |
| Orchestration | You | Schedule weekly recalculation, surface top-10 underserved districts |
| Execution | `execution/coverage_gap.py` | Compute OPI, generate GeoJSON, push to DB |

**Directive summary (`directives/coverage_gap_mapping.md`):**
- Input: Enrollment records (pincode, count, date), Census 2011 population by pincode, Aadhaar center locations (lat/lon), Youth population % by district
- Compute enrollment penetration ratio: `enrolled / total_population` per pincode
- Compute distance to nearest Aadhaar center per pincode centroid
- **Outreach Priority Index (OPI):**
  ```
  OPI = (0.35 × coverage_gap_score) 
      + (0.25 × population_density_score) 
      + (0.20 × youth_concentration_score) 
      + (0.20 × migration_pressure_score)
  ```
  All sub-scores normalized 0–1 before weighting.
- Digital Desert threshold: enrollment ratio < 0.60 AND nearest center > 15km
- Output: GeoJSON FeatureCollection with OPI, coverage_gap, digital_desert flag per feature
- Store in `geodata.coverage_scores` table (pincode, opi, coverage_ratio, is_digital_desert, computed_at)
- Edge case: pincodes with no census match → log to `warnings` table, skip from OPI
- Edge case: newly created pincodes not in Census 2011 → use parent district average

---

### Module 3 — Biometric Update Prediction System
| Layer | Location | Purpose |
|---|---|---|
| Directive | `directives/biometric_update_prediction.md` | CBGI formula, LSTM config, scheduling logic |
| Orchestration | You | Trigger demand forecast monthly, alert districts with high upcoming load |
| Execution | `execution/biometric_update_predictor.py` | Run LSTM time-series, compute CBGI, output demand forecasts |

**Directive summary (`directives/biometric_update_prediction.md`):**
- Mandatory update ages: 5 years (first biometric capture) and 15 years (fingerprint matures)
- Input: Enrollment records with DOB, last_biometric_update_date, district
- **Cohort tracking:** Group enrollees by birth year. For each cohort, track how many hit age 5/15 each month without updating.
- **Child Biometric Gap Index (CBGI):**
  ```
  CBGI = (missed_updates_in_district / expected_updates_in_district) × 100
  ```
  CBGI > 30 = High Risk district
- **LSTM Forecasting:**
  - Input features: monthly update counts (last 24 months), district population, seasonal indicators, CBGI
  - Target: next 6-month update demand per district
  - Target R² > 0.85 on validation split
  - Retrain monthly on new data
- Output: `update_demand_forecast` table (district, month, predicted_demand, confidence_interval, cbgi_score)
- Edge case: sparse data districts (< 500 enrollees) → use state-level LSTM instead of district
- Edge case: children enrolled without DOB → flag for manual review, exclude from cohort

---

### Module 4 — Duplicate Detection & Data Cleaning Engine
| Layer | Location | Purpose |
|---|---|---|
| Directive | `directives/duplicate_detection.md` | Fuzzy match thresholds, dedup pipeline, normalization rules |
| Orchestration | You | Run dedup on new batch uploads, report quality metrics |
| Execution | `execution/duplicate_detector.py` | RapidFuzz matching, biometric scoring, normalization, dedup write-back |

**Directive summary (`directives/duplicate_detection.md`):**
- Input: Aadhaar records CSV (aadhaar_number, name, dob, address, district, state, biometric_hash)
- **Name fuzzy matching:** RapidFuzz token_sort_ratio ≥ 88 with same DOB → candidate duplicate
- **Address normalization:** Standardize state names (e.g. "UP" → "Uttar Pradesh"), district names (use LGDI codes), remove noise tokens ("near", "opp", "behind", "h.no")
- **Biometric similarity:** Compare biometric_hash vectors — cosine similarity ≥ 0.92 → strong match
- **Dedup decision matrix:**
  - Name ≥ 88 AND DOB match AND biometric ≥ 0.92 → AUTO MERGE (keep older record, log merge)
  - Name ≥ 88 AND DOB match AND biometric 0.75–0.91 → MANUAL REVIEW queue
  - Name ≥ 88 AND DOB mismatch → FLAG for human review
  - Biometric ≥ 0.92 AND name mismatch → CRITICAL FLAG (possible identity theft)
- Output: `dedup_results` table with resolution_status, confidence_score, merged_into (aadhaar_number)
- Data quality score: `(clean_records / total_records) × 100` — target > 97%
- Edge case: common Indian names (Kumar, Singh, Sharma) — require DOB + district match before flagging
- Edge case: biometric hash unavailable (old records) → name+DOB+address triple match only

---

### Module 5 — Real-Time Aadhaar Operations Dashboard
| Layer | Location | Purpose |
|---|---|---|
| Directive | `directives/operations_dashboard.md` | KPI definitions, refresh intervals, alert thresholds |
| Orchestration | You | Refresh data on schedule, push WebSocket updates, escalate device failures |
| Execution | `execution/dashboard_metrics.py` | Aggregate metrics, compute KPIs, write to `metrics` table |

**Directive summary (`directives/operations_dashboard.md`):**
- Refresh intervals: KPIs every 5 min, charts every 15 min, center-level data every 1 hour
- **KPIs to display:**
  - Enrollment rate: daily/weekly count with WoW % change
  - Update request trend: 30-day rolling chart
  - Auth success rate: `(success / total_auth_attempts) × 100` — alert if < 94%
  - Center throughput: enrollments per center per day — rank bottom 10%
  - Device failure hotspots: biometric devices with error rate > 5% in last 24h
- **Weekend vs Weekday efficiency:** Compute separately; weekday baseline is primary benchmark
- **District-level service comparison:** Rank all districts by composite score (throughput, auth_success, wait_time)
- Output: `metrics_snapshot` table (metric_name, value, district, center_id, snapshot_at)
- Alert rules: auth_success < 94% → MEDIUM alert; device_error_rate > 10% → HIGH alert; daily enrollment drops > 40% WoW → investigate trigger
- Edge case: center goes offline (no data in 4h) → mark as OFFLINE, surface in dashboard

---

### Module 6 — Consent Locker System (Privacy Layer)
| Layer | Location | Purpose |
|---|---|---|
| Directive | `directives/consent_locker.md` | Consent schema, audit log rules, API contract |
| Orchestration | You | Process consent grant/revoke requests, validate requester identity |
| Execution | `execution/consent_manager.py` | CRUD for consent records, audit log writes, JWT-secured API |

**Directive summary (`directives/consent_locker.md`):**
- **Consent record schema:** (consent_id, aadhaar_id_hash, requester_id, data_scope[], granted_at, expires_at, revoked_at, status)
- Data scopes: `["name", "dob", "address", "photo", "biometric_hash", "enrollment_date"]`
- **Grant flow:** User authenticates via OTP → selects requester + scopes → sets expiry → system writes consent record + fires webhook to requester
- **Revoke flow:** User hits revoke → system sets revoked_at = NOW(), status = REVOKED → fires revocation webhook → requester must purge data within 24h
- **Audit log:** Every access attempt (granted or denied) logged to `consent_audit` table (immutable, append-only)
- **API endpoints:**
  - `POST /consent/grant` — create consent
  - `DELETE /consent/{consent_id}` — revoke
  - `GET /consent/history/{aadhaar_id_hash}` — view all grants/revocations
  - `POST /consent/verify` — requester checks if they have active consent
- All tokens are JWT HS256, expire in 15 minutes, signed with `CONSENT_SECRET` from `.env`
- Edge case: expired consent not explicitly revoked → auto-status = EXPIRED, access denied
- Edge case: requester accesses data after revocation → log UNAUTHORIZED, trigger fraud alert

---

### Module 7 — Migration & Demand Intelligence Engine
| Layer | Location | Purpose |
|---|---|---|
| Directive | `directives/migration_intelligence.md` | Migration Index formula, surge detection logic |
| Orchestration | You | Compute monthly migration index, recommend mobile unit deployment |
| Execution | `execution/migration_analyzer.py` | Compute inflow/outflow, migration index, demand surge forecast |

**Directive summary (`directives/migration_intelligence.md`):**
- Input: Address update records (old_district → new_district), new enrollment by district, NSSO migration data
- **Migration Index per district:**
  ```
  migration_index = (net_inflow / base_population) × 100
  net_inflow = new_enrollments_from_other_districts - outgoing_address_updates
  ```
- High inflow districts (migration_index > 8): flag for mobile enrollment unit deployment
- High outflow districts (migration_index < -5): reduce center staffing recommendation
- **Surge prediction:** 3-month rolling average migration trend → if trend accelerating, predict surge 2 months ahead
- Output: `migration_scores` table (district, month, migration_index, inflow_count, outflow_count, surge_flag)
- Mobile unit recommendation: top 5 high-inflow districts each quarter → output to `deployment_recommendations` table
- Edge case: seasonal migration (harvest, construction) → tag with migration_type = SEASONAL, apply seasonal adjustment factor

---

### Module 8 — Demand Forecasting & Resource Optimization
| Layer | Location | Purpose |
|---|---|---|
| Directive | `directives/demand_forecasting.md` | Prophet/ARIMA config, resource calculation formulas |
| Orchestration | You | Run quarterly forecasts, surface staffing recommendations |
| Execution | `execution/demand_forecaster.py` | Prophet time-series forecasting, resource optimizer |

**Directive summary (`directives/demand_forecasting.md`):**
- Input: 36-month historical enrollment + update counts, center capacity data, staff headcount
- **Models:** Facebook Prophet with Indian holiday calendar; fallback ARIMA(2,1,2) for sparse districts
- **Forecasts to produce (6-month horizon):**
  - Enrollment demand per district
  - Update workload (biometric + address updates)
  - Combined service load
- **Resource optimization:**
  - Staffing: `required_staff = ceil(predicted_load / (avg_throughput_per_staff × working_days))`
  - Devices: `required_devices = ceil(predicted_biometric_load / (device_capacity × uptime_factor))`
  - Uptime factor default: 0.85 (15% downtime buffer)
- Output: `demand_forecast` table + `resource_plan` table
- Target: reduce average wait time by 20% YoY; improve center utilization to 75–90% (away from under/over-load)
- Edge case: new district (< 12 months data) → use state-level Prophet model + district population scaling factor

---

### Module 9 — Advanced Anomaly Detection Layer
| Layer | Location | Purpose |
|---|---|---|
| Directive | `directives/advanced_anomaly_detection.md` | Statistical test configs, spike thresholds |
| Orchestration | You | Run tests on new data batches, escalate significant anomalies |
| Execution | `execution/anomaly_detector_stats.py` | Z-score, Kruskal-Wallis, ANOVA, IQR outlier detection |

**Directive summary (`directives/advanced_anomaly_detection.md`):**
- **Z-score analysis:** Rolling 30-day window per district. Z > 2.5 = anomaly spike in enrollment/update counts
- **IQR outlier detection:** For center-level throughput — flag centers below Q1 - 1.5×IQR or above Q3 + 1.5×IQR
- **Kruskal-Wallis test:** Compare enrollment distributions across districts within same state. p < 0.05 → significant disparity → route to coverage gap module
- **ANOVA test:** Compare mean throughput across center tiers (Tier 1/2/3 cities). Significant → adjust resource plans
- All anomaly findings written to `anomaly_log` table (test_type, entity, value, threshold, severity, detected_at)
- Weekly summary report: top 10 anomalies by severity, auto-emailed to dashboard

---

### Module 10 — Multi-Level Data Analysis System
| Layer | Location | Purpose |
|---|---|---|
| Directive | `directives/multilevel_analysis.md` | Hierarchy drill-down logic, aggregation rules |
| Orchestration | You | Handle user drill-down requests (State → District → Pincode) |
| Execution | `execution/multilevel_analyzer.py` | Hierarchical aggregation, drill-down queries, report generation |

**Directive summary (`directives/multilevel_analysis.md`):**
- Data hierarchy: National → State (36) → District (800+) → Pincode (19,000+)
- Each level stores pre-aggregated metrics in `analysis_cache` table (level, code, metric_name, value, computed_at)
- Cache refresh: National daily, State daily, District weekly, Pincode monthly
- On drill-down request: check cache freshness (< 24h for State, < 7 days for Pincode). If stale, trigger re-compute.
- **Metrics available at all levels:** enrollment_count, update_count, auth_success_rate, coverage_ratio, opi_score, cbgi_score, fraud_alert_count
- **Pincode-level special:** also compute nearest_center_distance, digital_desert_flag
- Output format: JSON with level, code, name, metrics{}, children_summary[], last_updated

---

### Module 11 — External Data Integration Layer
| Layer | Location | Purpose |
|---|---|---|
| Directive | `directives/external_data_integration.md` | Source list, ingestion schedule, schema mapping |
| Orchestration | You | Schedule ingestion jobs, detect schema changes in external sources |
| Execution | `execution/external_data_ingester.py` | Fetch, parse, normalize, and store external datasets |

**Directive summary (`directives/external_data_integration.md`):**
- **Data sources and schedules:**

  | Source | Endpoint / File | Schedule | Key fields |
  |---|---|---|---|
  | Census 2011 | Static CSV (bundled) | Once on setup | pincode, population, age_distribution |
  | Weather API | OpenWeatherMap `/forecast` | Daily | district, date, temp, rainfall, weather_code |
  | SDG Index | NITI Aayog API or CSV | Monthly | district, sdg_score, sdg_tier |
  | Economic indicators | RBI / MoSPI API | Monthly | district, per_capita_income, bank_branch_count |
  | Migration data | NSSO / Census CSV | Annually | district, in_migration_rate, out_migration_rate |

- **Weather impact model:** When rainfall > 25mm OR temp > 42°C → apply 30% attendance reduction factor to demand forecasts
- **Schema mapping:** All external data normalized to district LGDI code as join key before storage
- **Freshness tracking:** `data_sources` table (source_name, last_fetched_at, record_count, schema_hash)
- Edge case: API rate limit hit → exponential backoff (2^n seconds, max 10 retries), log to `ingestion_errors`
- Edge case: external schema change detected (schema_hash diff) → PAUSE ingestion, alert orchestration layer for manual review

---

## Operating Principles

**1. Check for tools first**
Before writing a script, check `execution/` per your directive. Only create new scripts if none exist. Each module's script handles its own domain — do not combine modules into one mega-script.

**2. Self-anneal when things break**
- Read error message and stack trace
- Fix the script and test it again (unless it uses paid API tokens/credits — in which case check with user first)
- Update the directive with what you learned (API limits, timing, edge cases, schema quirks)
- Example: Census CSV has inconsistent district name casing → fix normalizer in `execution/external_data_ingester.py` → add normalization note to `directives/external_data_integration.md`

**3. Update directives as you learn**
Directives are living documents. When you discover API constraints, better ML approaches, common data quality issues, or new edge cases — update the directive. Do not overwrite directives without asking unless explicitly told to.

---

## Self-Annealing Loop

Errors are learning opportunities. When something breaks:
1. Fix the script
2. Test the fix with a small data sample
3. Update the directive with the root cause and fix
4. Run the full pipeline again and verify
5. System is now stronger — same error will never break it again

**Common failure modes for this project:**
- Pincode/district name mismatches between data sources → always normalize to LGDI codes
- Missing DOB in enrollment records → never crash; skip record and log to `data_quality_issues`
- Biometric hash format inconsistency across vendors → normalize to base64-SHA256 in ingestion step
- LSTM training fails on sparse districts → fallback to state-level model (documented in directive 3)
- Consent JWT clock skew between services → use UTC everywhere, add 30s leeway in verification

---

## File Organization

```
aadhaar-intel-platform/
│
├── AGENTS.md                         ← This file (mirrored as CLAUDE.md, GEMINI.md)
├── CLAUDE.md                         ← Mirror of AGENTS.md
├── GEMINI.md                         ← Mirror of AGENTS.md
├── .env                              ← API keys, DB URL, secrets (never commit)
├── .gitignore                        ← Includes .env, .tmp/, __pycache__/
│
├── directives/                       ← Layer 1: SOPs per module
│   ├── fraud_detection.md
│   ├── coverage_gap_mapping.md
│   ├── biometric_update_prediction.md
│   ├── duplicate_detection.md
│   ├── operations_dashboard.md
│   ├── consent_locker.md
│   ├── migration_intelligence.md
│   ├── demand_forecasting.md
│   ├── advanced_anomaly_detection.md
│   ├── multilevel_analysis.md
│   └── external_data_integration.md
│
├── execution/                        ← Layer 3: Deterministic scripts
│   ├── fraud_detection.py            ← XGBoost + Isolation Forest fraud pipeline
│   ├── coverage_gap.py               ← OPI computation + GeoJSON generation
│   ├── biometric_update_predictor.py ← LSTM demand forecasting + CBGI
│   ├── duplicate_detector.py         ← RapidFuzz + biometric dedup pipeline
│   ├── dashboard_metrics.py          ← KPI aggregation for ops dashboard
│   ├── consent_manager.py            ← Consent CRUD + audit log + JWT API
│   ├── migration_analyzer.py         ← Migration index + surge detection
│   ├── demand_forecaster.py          ← Prophet + resource optimization
│   ├── anomaly_detector_stats.py     ← Z-score, Kruskal-Wallis, ANOVA
│   ├── multilevel_analyzer.py        ← Hierarchical drill-down queries
│   ├── external_data_ingester.py     ← Multi-source data fetch + normalize
│   └── db_setup.py                   ← Schema migrations (run once on setup)
│
├── frontend/                         ← React / Next.js web application
│   ├── pages/
│   │   ├── index.tsx                 ← Landing dashboard (Module 5)
│   │   ├── fraud.tsx                 ← Module 1: Fraud Detection
│   │   ├── coverage.tsx              ← Module 2: Coverage Map
│   │   ├── biometric.tsx             ← Module 3: Biometric Updates
│   │   ├── dedup.tsx                 ← Module 4: Duplicate Detection
│   │   ├── consent.tsx               ← Module 6: Consent Locker
│   │   ├── migration.tsx             ← Module 7: Migration Intelligence
│   │   ├── forecast.tsx              ← Module 8: Demand Forecasting
│   │   └── analytics.tsx             ← Modules 9–11: Advanced Analytics
│   ├── components/
│   │   ├── FraudAlertCard.tsx
│   │   ├── HeatMap.tsx               ← Leaflet.js choropleth
│   │   ├── TimeSeriesChart.tsx       ← Recharts line/area chart
│   │   ├── KPIBar.tsx
│   │   ├── ConsentCard.tsx
│   │   └── AnomalyBadge.tsx
│   └── lib/
│       ├── api.ts                    ← Typed API client (calls FastAPI backend)
│       └── constants.ts
│
├── backend/                          ← FastAPI application
│   ├── main.py                       ← App entrypoint, route registration
│   ├── routers/
│   │   ├── fraud.py
│   │   ├── coverage.py
│   │   ├── biometric.py
│   │   ├── dedup.py
│   │   ├── dashboard.py
│   │   ├── consent.py
│   │   ├── migration.py
│   │   ├── forecast.py
│   │   └── analytics.py
│   ├── models/                       ← SQLAlchemy ORM models
│   │   └── *.py
│   ├── schemas/                      ← Pydantic request/response schemas
│   │   └── *.py
│   └── services/                     ← Business logic (calls execution/ scripts)
│       └── *.py
│
├── data/                             ← Static seed data and CSVs
│   ├── census_2011_district.csv
│   ├── lgdi_district_codes.csv
│   ├── india_pincodes.geojson
│   └── sample_enrollment_data.csv
│
├── ml_models/                        ← Trained model artifacts
│   ├── fraud_xgboost.pkl
│   ├── fraud_isolation_forest.pkl
│   ├── biometric_lstm.h5
│   └── demand_prophet/               ← Per-district Prophet model files
│
├── tests/                            ← Unit + integration tests
│   ├── test_fraud_detection.py
│   ├── test_coverage_gap.py
│   ├── test_dedup.py
│   ├── test_consent_manager.py
│   └── test_demand_forecaster.py
│
└── .tmp/                             ← Intermediate files (never commit)
    ├── raw_ingestion/
    ├── model_checkpoints/
    └── export_staging/
```

---

## Tech Stack

```
Frontend:   Next.js 14, React 18, Tailwind CSS, Recharts, Leaflet.js
Backend:    FastAPI (Python 3.11), Uvicorn, SQLAlchemy 2.0
Database:   PostgreSQL 16 (primary), Redis (alert queuing + caching)
ML Stack:   Scikit-learn, XGBoost, TensorFlow/Keras, Prophet, RapidFuzz
Auth:       JWT (HS256), OTP via MSG91 API
APIs:       OpenWeatherMap, LGDI District API, NITI Aayog SDG
Infra:      Docker + Docker Compose (all services), Nginx reverse proxy
Monitoring: Prometheus + Grafana (optional for hackathon demo)
```

---

## Environment Variables (`.env`)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aadhaar_intel
REDIS_URL=redis://localhost:6379

# Auth
CONSENT_SECRET=<jwt_secret_key>
OTP_API_KEY=<msg91_api_key>

# External APIs
OPENWEATHER_API_KEY=<key>
NITI_AAYOG_API_KEY=<key>

# ML Config
MODEL_DIR=./ml_models
FRAUD_ALERT_THRESHOLD=0.75
GEO_ANOMALY_KM=500
GEO_ANOMALY_MINUTES=30

# App
ENV=development
API_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

---

## Database Schema (Key Tables)

```sql
-- Core tables (created by execution/db_setup.py)

alerts (id, aadhaar_id_hash, alert_type, severity, reason, evidence_json, created_at, resolved_at)
coverage_scores (pincode, opi, coverage_ratio, is_digital_desert, computed_at)
update_demand_forecast (district, month, predicted_demand, confidence_low, confidence_high, cbgi_score)
dedup_results (record_id, match_id, resolution_status, confidence_score, merged_into, resolved_at)
metrics_snapshot (metric_name, value, district, center_id, snapshot_at)
consent_records (consent_id, aadhaar_id_hash, requester_id, data_scope, granted_at, expires_at, revoked_at, status)
consent_audit (id, consent_id, action, actor_id, outcome, timestamp)
migration_scores (district, month, migration_index, inflow_count, outflow_count, surge_flag)
demand_forecast (district, month, enrollment_forecast, update_forecast, confidence_interval)
resource_plan (district, quarter, required_staff, required_devices, current_staff, current_devices)
anomaly_log (id, test_type, entity, entity_type, value, threshold, severity, detected_at)
analysis_cache (level, code, metric_name, value, computed_at)
data_sources (source_name, last_fetched_at, record_count, schema_hash, status)
data_quality_issues (id, source, record_id, issue_type, description, logged_at)
```

---

## Setup & Run (Hackathon Quick Start)

```bash
# 1. Clone and setup
git clone <repo_url> && cd aadhaar-intel-platform
cp .env.example .env  # fill in your keys

# 2. Start services
docker-compose up -d  # starts PostgreSQL, Redis

# 3. Initialize database + seed data
python execution/db_setup.py
python execution/external_data_ingester.py --source census  # seed Census 2011

# 4. Train initial ML models (uses sample data)
python execution/fraud_detection.py --mode train
python execution/biometric_update_predictor.py --mode train
python execution/demand_forecaster.py --mode train

# 5. Start backend
cd backend && uvicorn main:app --reload --port 8000

# 6. Start frontend
cd frontend && npm install && npm run dev  # runs on :3000
```

---

## Summary

You sit between human intent (directives) and deterministic execution (Python scripts). Read the right directive, make decisions, call the right execution script, handle errors, update directives with learnings, and continuously improve the system.

The 11 modules are independent but share one PostgreSQL database and one FastAPI backend. Each module has its own directive, its own execution script, and its own frontend page. When a user request spans multiple modules (e.g., "why is coverage low in Bihar?" → involves Module 2 + Module 7 + Module 11), chain the relevant execution scripts in sequence and synthesize the outputs before responding.

**Be pragmatic. Be reliable. Self-anneal.**
