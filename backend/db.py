"""
MongoDB async connection helper for AadhaarIntel platform.
OFFLINE-SAFE: If MongoDB is unavailable, the backend runs on mock data.
Accepts connection string from env var MONGODB_URI or .env file.
"""

import os
import sys
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("aadhaarintel.db")

MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB = os.getenv("MONGODB_DB", "AadharDB")

client: AsyncIOMotorClient = None
db = None
DB_CONNECTED = False


async def connect_db():
    """Initialize MongoDB connection. Fails silently — backend uses mock data if unavailable."""
    global client, db, DB_CONNECTED

    if not MONGODB_URI or "YOUR_USERNAME" in MONGODB_URI or "YOUR_PASSWORD" in MONGODB_URI:
        print("[DB] WARNING: No valid MONGODB_URI set. Running in MOCK DATA mode.")
        print("    Set MONGODB_URI in .env to connect to real MongoDB.")
        DB_CONNECTED = False
        return

    try:
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        db = client[MONGODB_DB]
        await client.admin.command("ping")
        DB_CONNECTED = True
        print(f"[DB] Connected to MongoDB: {MONGODB_DB}")
    except Exception as e:
        DB_CONNECTED = False
        db = None
        print(f"[DB] WARNING: MongoDB connection failed: {e}")
        print("    Running in MOCK DATA mode. Set correct MONGODB_URI to use real data.")


async def close_db():
    """Close MongoDB connection on app shutdown."""
    global client
    if client:
        client.close()
        print("[DB] MongoDB connection closed.")


def get_db():
    """Return the database instance, or None if not connected."""
    return db


def is_connected() -> bool:
    """Return True if MongoDB is connected."""
    return DB_CONNECTED
