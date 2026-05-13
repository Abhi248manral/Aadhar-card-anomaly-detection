/**
 * AadhaarIntel — RFID Bridge Server
 * ──────────────────────────────────
 * Reads RFID card UIDs from Arduino (MFRC522) over USB Serial
 * and exposes them to the Aadhar frontend via REST API + Socket.IO.
 *
 * Usage:
 *   node server.js
 *
 * Environment variables (.env):
 *   RFID_PORT  — HTTP port (default 3000)
 *   COM_PORT   — Serial port override (default: auto-detect)
 *   BAUD_RATE  — Serial baud rate (default 9600)
 */

require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

// ── Configuration ─────────────────────────────────────────
const RFID_PORT = parseInt(process.env.RFID_PORT) || 3000;
const COM_PORT = process.env.COM_PORT || null;           // null = auto-detect
const BAUD_RATE = parseInt(process.env.BAUD_RATE) || 9600;
const RECONNECT_INTERVAL = 5000;                          // ms between reconnect attempts

// ── Express + Socket.IO Setup ─────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

const io = new Server(server, {
  cors: { origin: "*" }
});

// Serve the Aadhar frontend (optional — also served by FastAPI on :8000)
app.use(express.static("frontend"));

// ── Scan State ────────────────────────────────────────────
let latestUID = null;
let latestTime = null;
let scanCount = 0;
let arduinoConnected = false;
let serialPortPath = null;
let currentPort = null;
let reconnectTimer = null;

// ── Serial Port — Dynamic Import & Auto-detect ────────────
let SerialPort, ReadlineParser;

async function loadSerialPort() {
  try {
    const sp = require("serialport");
    const rp = require("@serialport/parser-readline");
    SerialPort = sp.SerialPort;
    ReadlineParser = rp.ReadlineParser;
    return true;
  } catch (err) {
    console.error("❌ serialport module not found. Run: npm install");
    console.error("   Server will run in MANUAL mode (accepts POST /api/rfid only)");
    return false;
  }
}

/**
 * List all available serial ports and log them.
 * Returns the list of port info objects.
 */
async function listPorts() {
  try {
    const ports = await SerialPort.list();
    if (ports.length === 0) {
      console.log("⚠  No serial ports found. Is the Arduino plugged in?");
    } else {
      console.log("📋 Available serial ports:");
      ports.forEach(p => {
        console.log(`   ${p.path}  —  ${p.manufacturer || "Unknown"} | ${p.pnpId || ""}`);
      });
    }
    return ports;
  } catch (err) {
    console.error("❌ Failed to list serial ports:", err.message);
    return [];
  }
}

/**
 * Auto-detect the Arduino port by matching known manufacturer strings.
 */
async function detectArduinoPort() {
  const ports = await listPorts();
  
  // Common Arduino identifiers
  const arduinoKeywords = [
    "arduino", "ch340", "ch341", "cp210", "ftdi",
    "usb-serial", "usb serial", "wch", "silicon labs"
  ];

  for (const port of ports) {
    const desc = `${port.manufacturer || ""} ${port.pnpId || ""} ${port.friendlyName || ""}`.toLowerCase();
    if (arduinoKeywords.some(kw => desc.includes(kw))) {
      console.log(`🔍 Auto-detected Arduino on: ${port.path} (${port.manufacturer || "Unknown"})`);
      return port.path;
    }
  }

  // Fallback: if only one serial port exists, assume it's the Arduino
  if (ports.length === 1) {
    console.log(`🔍 Only one serial port found, using: ${ports[0].path}`);
    return ports[0].path;
  }

  return null;
}

/**
 * Connect to the Arduino serial port.
 * Tries the configured COM_PORT first, then auto-detect.
 */
async function connectArduino() {
  if (!SerialPort) return;
  
  // Close existing connection if any
  if (currentPort && currentPort.isOpen) {
    try { currentPort.close(); } catch (_) {}
  }

  // Determine port
  let portPath = COM_PORT;
  if (!portPath) {
    portPath = await detectArduinoPort();
  }

  if (!portPath) {
    console.log("⚠  No Arduino port found. Will retry in " + (RECONNECT_INTERVAL / 1000) + "s...");
    console.log("   Tip: Set COM_PORT in .env or plug in the Arduino.");
    scheduleReconnect();
    return;
  }

  try {
    currentPort = new SerialPort({
      path: portPath,
      baudRate: BAUD_RATE,
      autoOpen: false,
    });

    const parser = currentPort.pipe(new ReadlineParser({ delimiter: "\r\n" }));

    currentPort.open((err) => {
      if (err) {
        console.error(`❌ Failed to open ${portPath}: ${err.message}`);
        arduinoConnected = false;
        scheduleReconnect();
        return;
      }

      console.log(`✅ Serial Port ${portPath} opened at ${BAUD_RATE} baud`);
      arduinoConnected = true;
      serialPortPath = portPath;

      // Cancel any pending reconnect
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    });

    // Handle incoming RFID data
    parser.on("data", (data) => {
      const line = data.trim();

      // Skip Arduino boot messages
      if (!line || line === "Scan your card..." || line === "READY") {
        console.log(`📟 Arduino: ${line}`);
        return;
      }

      console.log(`📥 Card UID: ${line}`);

      latestUID = line;
      latestTime = new Date().toISOString();
      scanCount++;

      // Push to all connected Socket.IO clients
      io.emit("rfid-data", {
        uid: line,
        time: latestTime,
        scanCount: scanCount,
      });
    });

    // Handle disconnect
    currentPort.on("close", () => {
      console.log("⚠  Serial port closed");
      arduinoConnected = false;
      scheduleReconnect();
    });

    currentPort.on("error", (err) => {
      console.error("❌ Serial Port Error:", err.message);
      arduinoConnected = false;
      scheduleReconnect();
    });

  } catch (err) {
    console.error(`❌ Could not connect to ${portPath}: ${err.message}`);
    arduinoConnected = false;
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return; // already scheduled
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    console.log("🔄 Attempting to reconnect to Arduino...");
    connectArduino();
  }, RECONNECT_INTERVAL);
}

// ── REST API ──────────────────────────────────────────────

/**
 * GET /api/latest
 * Returns the most recently scanned RFID UID.
 * This is polled by the Aadhar frontend every 1 second.
 */
app.get("/api/latest", (_req, res) => {
  res.json({
    uid: latestUID,
    time: latestTime,
    scanCount: scanCount,
    arduinoConnected: arduinoConnected,
    port: serialPortPath,
  });
});

/**
 * POST /api/rfid
 * Manual UID injection (used by Python bridge or testing).
 * Body: { "uid": "AABBCCDD" }
 */
app.post("/api/rfid", (req, res) => {
  const { uid } = req.body;

  if (!uid || typeof uid !== "string" || uid.trim().length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'uid' in request body" });
  }

  const cleanUID = uid.trim().toUpperCase();
  console.log(`📥 Manual UID received via POST: ${cleanUID}`);

  latestUID = cleanUID;
  latestTime = new Date().toISOString();
  scanCount++;

  // Push to all connected Socket.IO clients
  io.emit("rfid-data", {
    uid: cleanUID,
    time: latestTime,
    scanCount: scanCount,
  });

  res.json({
    status: "ok",
    uid: cleanUID,
    time: latestTime,
    scanCount: scanCount,
  });
});

/**
 * GET /api/health
 * Server health check with Arduino status.
 */
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "AadhaarIntel RFID Bridge",
    port: RFID_PORT,
    arduino: {
      connected: arduinoConnected,
      serialPort: serialPortPath,
      baudRate: BAUD_RATE,
    },
    stats: {
      totalScans: scanCount,
      lastUID: latestUID,
      lastScanTime: latestTime,
    },
  });
});

/**
 * GET /api/ports
 * List all available serial ports (for debugging / config UI).
 */
app.get("/api/ports", async (_req, res) => {
  if (!SerialPort) {
    return res.json({ ports: [], error: "serialport module not available" });
  }
  try {
    const ports = await SerialPort.list();
    res.json({ ports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Socket.IO ─────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`🌐 Client connected (id: ${socket.id})`);

  // Send current state to newly connected client
  socket.emit("rfid-status", {
    arduinoConnected,
    port: serialPortPath,
    latestUID,
    latestTime,
    scanCount,
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected (id: ${socket.id})`);
  });
});

// ── Start Server ──────────────────────────────────────────
async function main() {
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║   AadhaarIntel — RFID Bridge Server           ║");
  console.log("╚═══════════════════════════════════════════════╝");
  console.log(`   HTTP Port : ${RFID_PORT}`);
  console.log(`   COM Port  : ${COM_PORT || "auto-detect"}`);
  console.log(`   Baud Rate : ${BAUD_RATE}`);
  console.log();

  // Load serialport module
  const hasSerial = await loadSerialPort();

  if (hasSerial) {
    await connectArduino();
  } else {
    console.log("");
    console.log("📡 Running in MANUAL mode:");
    console.log("   POST UIDs via: curl -X POST http://localhost:" + RFID_PORT + "/api/rfid -H 'Content-Type: application/json' -d '{\"uid\":\"AABBCCDD\"}'");
    console.log("");
  }

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n❌ Port ${RFID_PORT} is already in use!`);
      console.error(`   Another process is using this port.`);
      console.error(`   Solutions:`);
      console.error(`     1. Stop the other process using port ${RFID_PORT}`);
      console.error(`     2. Change RFID_PORT in .env to a different port (e.g. 3001)`);
      console.error(`     3. Run: netstat -aon | findstr :${RFID_PORT}  to find the process\n`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(RFID_PORT, () => {
    console.log(`🚀 RFID Bridge Server running → http://localhost:${RFID_PORT}`);
    console.log(`   REST API  → http://localhost:${RFID_PORT}/api/latest`);
    console.log(`   Health    → http://localhost:${RFID_PORT}/api/health`);
    console.log(`   Ports     → http://localhost:${RFID_PORT}/api/ports`);
    console.log();
  });
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
