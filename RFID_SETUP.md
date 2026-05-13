# RFID Scanner Setup Guide

## Overview

The AadhaarIntel RFID system uses an **Arduino + MFRC522** reader to scan RFID/NFC cards and display the UID in real-time on the web dashboard.

```
RFID Card → MFRC522 → Arduino → USB → server.js (:3000) → Frontend (app.js)
```

---

## Hardware Wiring

### MFRC522 → Arduino Uno/Nano

| MFRC522 Pin | Arduino Pin |
|-------------|-------------|
| SDA (SS)    | Pin 10      |
| SCK         | Pin 13      |
| MOSI        | Pin 11      |
| MISO        | Pin 12      |
| IRQ         | (not used)  |
| GND         | GND         |
| RST         | Pin 9       |
| 3.3V        | 3.3V        |

> ⚠️ **IMPORTANT**: The MFRC522 operates at **3.3V**. Do NOT connect VCC to 5V.

---

## Step 1: Upload Arduino Sketch

1. Open `arduino/RFID_TO_PC_Bridge/RFID_TO_PC_Bridge.ino` in Arduino IDE
2. Install the **MFRC522** library:
   - `Sketch → Include Library → Manage Libraries → search "MFRC522" → Install`
3. Select your board: `Tools → Board → Arduino Uno` (or your board)
4. Select port: `Tools → Port → COMx` (note this port number)
5. Click **Upload** ✅

After upload, open Serial Monitor (9600 baud) to verify:
```
Scan your card...
```
Tap a card and you should see: `AABBCCDD` (the UID in hex)

---

## Step 2: Configure & Start the Bridge Server

### Install Dependencies
```bash
cd "culprit coders/Aadhar Card"
npm install
```

### Configure COM Port
Edit `.env` in the project root:
```env
RFID_PORT=3000
COM_PORT=COM7        # ← Change to your Arduino's port (check Device Manager)
BAUD_RATE=9600
```

**Finding your COM port:**
- **Windows**: Open Device Manager → Ports (COM & LPT) → Look for "Arduino" or "CH340"
- **Or**: Run `node -e "require('serialport').SerialPort.list().then(p => console.log(p))"`

### Start the Server
```bash
node server.js
```

You should see:
```
╔═══════════════════════════════════════════════╗
║   AadhaarIntel — RFID Bridge Server           ║
╚═══════════════════════════════════════════════╝
   HTTP Port : 3000
   COM Port  : COM7
   Baud Rate : 9600

📋 Available serial ports:
   COM7  —  wch.cn | USB\VID_1A86&PID_7523
✅ Serial Port COM7 opened at 9600 baud
🚀 RFID Bridge Server running → http://localhost:3000
```

---

## Step 3: Start the Aadhar Backend (optional)

```bash
cd backend
pip install -r ../requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Step 4: Open the Frontend

Open `frontend/index.html` in a browser, then navigate to the **RFID Scanner** page from the sidebar.

- ✅ Status shows "Connected"
- 📡 UID appears when you tap a card
- 📊 Scan history and frequency chart update live

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Serial Port Error" | Check COM port in `.env`. Try different port numbers. |
| "No serial ports found" | Is the Arduino plugged in? Check USB cable. |
| Frontend shows "Server offline" | Is `node server.js` running? Check port 3000. |
| UID not appearing | Open Arduino Serial Monitor (close it first — only one app can use COM port) |
| Permission denied on COM port | Close Arduino IDE's Serial Monitor before starting server.js |

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/latest` | GET | Latest UID, timestamp, scan count, Arduino status |
| `/api/rfid` | POST | Manually inject a UID (`{ "uid": "AABB" }`) |
| `/api/health` | GET | Server health + Arduino connection info |
| `/api/ports` | GET | List all available serial ports |

---

## Architecture

Two servers run simultaneously:

| Server | Port | Purpose |
|--------|------|---------|
| **FastAPI** (Python) | 8000 | Aadhar backend (dashboard, fraud, coverage, etc.) |
| **Node.js** (Express) | 3000 | RFID bridge (serial → REST/WebSocket) |

The frontend polls both: FastAPI for dashboard data, Node.js for RFID scans.
