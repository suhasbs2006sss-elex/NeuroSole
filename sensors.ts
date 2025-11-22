import express from "express";
import { addSensorReading, getLatestReading } from "../db";

const router = express.Router();

// --- Memory Store for Control/Settings ---
let VIBRATION_DURATION_MS = 10000;
let DEVICE_CONTROL_STATUS = "ON";
// -----------------------------------------

// --- GEMINI API SETUP (TypeScript) ---
const GEMINI_API_KEY = "";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

// Function to call the Gemini API
async function getAIResponse(prompt: string): Promise<string> {
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: {
            parts: [{ text: "You are a specialized clinical assistant for Diabetic Peripheral Neuropathy (DPN) monitoring. Provide a concise, single-paragraph risk assessment (under 40 words) and a recommended action for the clinician based ONLY on the data provided." }]
        },
    };

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
       
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "AI Error: Analysis unavailable.";
       
        return text;
    } catch (error) {
        console.error("[GEMINI ERROR]", error);
        return "AI Service Connection Failure.";
    }
}
// -----------------------------------------

// --- 1. SENSOR DATA ROUTES (READ/WRITE) ---

// 1.1 GET /latest: Dashboard READ route
router.get("/latest", async (req, res) => {
    const r = await getLatestReading();
    let responseData;

    if (!r) {
        responseData = {
            temperature: "N/A",
            pressure: "N/A",
            moisture: "N/A",
            vibration: "N/A",
            timestamp: "No Data Yet"
        };
    } else {
        responseData = r;
    }
   
    // FIX: Include the current DEVICE_CONTROL_STATUS in the response payload for sync
    res.json({
        ...responseData,
        devicePowerStatus: DEVICE_CONTROL_STATUS
    });
});

// 1.2 POST /data: ESP32 WRITE route
router.post("/data", async (req, res) => {
    // SECURITY CHECK: Don't save data if the user has issued a remote OFF command.
    if (DEVICE_CONTROL_STATUS === "OFF") {
        return res.status(202).json({ status: "Ignored. Device is remotely OFF." });
    }

    const { temperature, pressure, moisture, vibration } = req.body;
   
    if (temperature === undefined || pressure === undefined || moisture === undefined || vibration === undefined) {
        return res.status(400).json({ error: "Missing required sensor data fields." });
    }

    const reading = {
        temperature: parseFloat(temperature),
        pressure: parseFloat(pressure),
        moisture: parseFloat(moisture),
        vibration: parseFloat(vibration),
        timestamp: new Date().toISOString()
    };
   
    await addSensorReading(reading);
    res.status(201).json({ status: "Reading saved successfully." });
});

// --- NEW 2. AI RISK ANALYSIS ROUTE ---
router.post("/ai/risk-analysis", async (req, res) => {
    const { temperature, vibration, overallStatus } = req.body;

    const prompt = `Assess the neuropathic risk. Current Temperature: ${temperature}°C. Vibration Perception: ${vibration}g. Overall Status: ${overallStatus}.`;

    const analysis = await getAIResponse(prompt);

    res.status(200).json({ analysis });
});
// ------------------------------------

// --- 3. VIBRATION SETTINGS ROUTES ---

// 3.1 POST /settings/vibration: To save the user's custom duration (from the frontend)
router.post("/settings/vibration", (req, res) => {
    const { duration } = req.body;
    const newDuration = parseInt(duration);

    const MIN_MS = 10000;
    const MAX_MS = 300000;

    if (isNaN(newDuration) || newDuration < MIN_MS || newDuration > MAX_MS) {
        return res.status(400).json({ status: `Invalid duration. Must be ${MIN_MS/1000}s - ${MAX_MS/1000}s.` });
    }

    VIBRATION_DURATION_MS = newDuration; // Store in memory
    console.log(`[SETTINGS] Vibration duration set to: ${VIBRATION_DURATION_MS}ms`);
   
    res.status(200).json({ status: "Vibration duration saved!", newDuration: VIBRATION_DURATION_MS });
});

// 3.2 GET /settings/vibration: For the ESP32 to retrieve the setting
router.get("/settings/vibration", (req, res) => {
    res.status(200).json({ duration: VIBRATION_DURATION_MS });
});

// --- 4. DEVICE CONTROL ROUTES (ON/OFF) ---

// 4.1 POST /control/power: To send the device control command (from frontend)
router.post("/control/power", (req, res) => {
    const { command } = req.body;

    if (command !== "OFF" && command !== "ON") {
        return res.status(400).json({ status: "Invalid command. Must be 'ON' or 'OFF'." });
    }

    DEVICE_CONTROL_STATUS = command; // Update memory status
    console.log(`[CONTROL] Device commanded to: ${command}`);
   
    res.status(200).json({ status: `Device successfully commanded to ${command}.` });
});

// 4.2 GET /control/power: For the ESP32 to retrieve the current power state
router.get("/control/power", (req, res) => {
    res.status(200).json({ command: DEVICE_CONTROL_STATUS });
});

export default router;
