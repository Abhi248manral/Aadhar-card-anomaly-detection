"""
AadhaarIntel — FastAPI Backend Entrypoint
Offline-safe: runs on mock data if MongoDB is unavailable.
Set MONGODB_URI in .env to use real data.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from db import connect_db, close_db, is_connected
from routers import (dashboard, fraud, coverage, biometric,
                     dedup, consent, migration, forecast, analytics, data_store)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="AadhaarIntel API",
    description="Intelligent, Predictive & Citizen-Controlled Aadhaar Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(fraud.router, prefix="/api/fraud", tags=["Fraud Detection"])
app.include_router(coverage.router, prefix="/api/coverage", tags=["Coverage Gap"])
app.include_router(biometric.router, prefix="/api/biometric", tags=["Biometric Updates"])
app.include_router(dedup.router, prefix="/api/dedup", tags=["Duplicate Detection"])
app.include_router(consent.router, prefix="/api/consent", tags=["Consent Locker"])
app.include_router(migration.router, prefix="/api/migration", tags=["Migration Intelligence"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["Demand Forecasting"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(data_store.router, prefix="/api/store", tags=["Data Store"])


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "AadhaarIntel API",
        "version": "1.0.0",
        "db_connected": is_connected(),
        "mode": "live" if is_connected() else "mock",
    }


# ---- Serve frontend static files ----
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

