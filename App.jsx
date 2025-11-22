import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Gauge, Droplet, Zap, Thermometer, Clock, TrendingUp, AlertTriangle, XCircle, CheckCircle, HeartPulse, Activity, LineChart, Settings, Power, Brain } from 'lucide-react';

// --- THEME CONSTANTS ---
const CRITICAL_RED = 'border-red-600';
const WARNING_ORANGE = 'border-orange-500';
const NORMAL_GREEN = 'border-green-500';
const CONTROL_OFF = 'bg-slate-600';
const PRIMARY_ACCENT = 'bg-sky-500';

// --- VISUALIZATION: Simple Line Chart Component (unchanged) ---
const HistoricalChart = ({ history = [], color }) => {
    // FIX: Ensure history defaults to [] to prevent 'map is not defined' crash
    const values = history.map(d => parseFloat(d.value)).slice(-15);
    const maxVal = Math.max(...values) || 100;
    const minVal = Math.min(...values) || 0;
    const range = maxVal - minVal || 1;
    const height = 60;
    const width = 100;

    if (values.length < 2) return <div className="text-center text-xs text-gray-400 pt-2">Collecting data...</div>;

    const points = values.map((val, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((val - minVal) / range) * height;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');

    return (
        <div className="pt-2">
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
                <line x1="0" y1={height} x2={width} y2={height} stroke="#374151" strokeWidth="0.5" />
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    points={points}
                    className="transition-all duration-300"
                />
            </svg>
        </div>
    );
};


// --- BACKGROUND COMPONENT: Subtle Pulse Waves (unchanged) ---
const PulseWave = ({ color, duration, delay, position, size = 500 }) => {
    const animationName = `pulse-drift-${Math.random().toString(36).substring(7)}`;

    const customKeyframes = `
        @keyframes ${animationName} {
            0% { transform: scale(0.1) translate(-100px, 0); opacity: 0; }
            50% { opacity: 0.15; }
            100% { transform: scale(2.0) translate(100px, 0); opacity: 0; }
        }
    `;

    const waveStyles = {
        position: 'absolute',
        top: `${position}%`,
        left: '50%',
        width: `${size}px`,
        height: `${size}px`,
        animation: `${animationName} ${duration}s linear ${delay}s infinite`,
        zIndex: 0,
        filter: `blur(50px)`,
        borderRadius: '50%',
        backgroundColor: color,
    };

    return (
        <React.Fragment>
            <style>{customKeyframes}</style>
            <div style={waveStyles} />
        </React.Fragment>
    );
};

const BackgroundTelemetry = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <PulseWave color="#0077b6" duration={35} delay={0} position={20} />
        <PulseWave color="#48cae4" duration={45} delay={15} position={80} />
    </div>
);


// --- SVG Companion: Biosignal Monitor (Talking Character) (unchanged) ---
const BiosignalMonitor = ({ status }) => {
    const isCritical = status.includes("CRITICAL");
    const isWarning = status.includes("WARNING");
    const isOffline = status.includes("OFFLINE");
    const isNoData = status.includes("NO DATA");

    const StatusIcon = isCritical ? XCircle : isWarning ? AlertTriangle : isNoData ? Clock : HeartPulse;

    const color = isCritical ? 'text-red-600' : isWarning ? 'text-orange-500' : isNoData ? 'text-gray-500' : 'text-green-500';
    const bgColor = isCritical ? 'bg-red-50' : isWarning ? 'bg-orange-50' : isNoData ? 'bg-gray-200' : 'bg-green-50';

    const animationName = 'slow-breathing';
    const customStyles = `
        @keyframes ${animationName} {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
    `;
    const animationClass = isCritical
        ? 'animate-pulse'
        : isWarning
            ? 'animate-bounce'
            : `animate-[${animationName}_4s_ease-in-out_infinite]`;

    let message = "Stable. All biosignals within normal range.";
    let bubbleColor = 'bg-sky-500';
    if (isCritical) {
        message = "ALERT! Neuropathic risk CRITICAL. Immediate review needed.";
        bubbleColor = 'bg-red-600';
    } else if (isWarning) {
        message = "Warning: Signal irregularity detected. Increase monitoring frequency.";
        bubbleColor = 'bg-orange-500';
    } else if (isOffline) {
        message = "Device connection lost. Verify server connection.";
        bubbleColor = 'bg-gray-600';
    } else if (isNoData) {
        message = "Awaiting first sensor transmission from the device.";
        bubbleColor = 'bg-slate-500';
    }

    return (
        <div className="relative p-6 bg-white rounded-xl shadow-lg border border-sky-200">
            <style>{customStyles}</style>

            {/* Speech Bubble */}
            <div className={`absolute -top-10 left-1/2 transform -translate-x-1/2 py-2 px-4 rounded-lg text-sm font-medium whitespace-nowrap z-10 ${bubbleColor} text-white shadow-md`} >
                {message}
            </div>

            {/* Companion Icon */}
            <div className={`w-full h-16 flex justify-center items-center transition duration-500 ${animationClass} ${bgColor} rounded-full`}>
                <StatusIcon size={48} className={color} />
            </div>
        </div>
    );
};

// --- Sensor Card with Chart View (unchanged) ---

const SensorCard = ({ title, value, unit, icon: Icon, colorClass, statusText, percentage, statusBarColor, history }) => {

    const iconColor = colorClass.replace('border-l-4', 'text');
    let StatusIcon = CheckCircle;
    if (statusText === "CRITICAL" || statusText === "OFFLINE") StatusIcon = XCircle;
    else if (statusText === "WARNING") StatusIcon = AlertTriangle;

    return (
        <div className={`p-5 bg-white rounded-xl shadow-lg border-l-4 ${colorClass} transition duration-300 hover:shadow-xl hover:scale-[1.01] cursor-default`}>
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-gray-500">
                        <Icon className="w-5 h-5" />
                        <p className="text-sm font-semibold uppercase tracking-wider">{title}</p>
                    </div>
                    <p className={`text-4xl font-extrabold text-gray-800`}>
                        {value}
                        <span className="text-xl font-normal text-gray-400 ml-1">{unit}</span>
                    </p>
                </div>
                <div className={`flex items-center space-x-1 p-2 rounded-full text-xs font-bold shadow-inner ${statusBarColor.replace('bg-', 'bg-')}/30 ${iconColor} bg-white border ${colorClass}`}>
                    <StatusIcon size={14} className={iconColor} />
                    <span>{statusText}</span>
                </div>
            </div>

            <StatusBar percentage={percentage} color={statusBarColor} />

            {/* Integrated Trend Chart */}
            <div className="mt-3">
                <HistoricalChart history={history} color={statusBarColor.replace('bg-', '')} />
            </div>
        </div>
    );
};

// --- Logic (unchanged) ---

const StatusBar = ({ percentage, color }) => {
    return (
        <div className="w-full h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${color.replace('border-', 'bg-')}`}
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

const getStatusData = (value, min, max, safe) => {
    const isError = value === "N/A" || value === "CONN ERR" || value === "No Data Yet";

    if (isError) {
        return {
            colorClass: 'border-gray-400',
            statusText: value === "CONN ERR" ? "OFFLINE" : "NO DATA",
            statusBarColor: 'bg-gray-400',
            percentage: 0
        };
    }

    const numericValue = parseFloat(value);
    const range = max - min;
    const percentage = Math.min(100, Math.max(0, ((numericValue - min) / range) * 100));

    if (numericValue < min || numericValue > max) {
        return { colorClass: CRITICAL_RED, statusText: "CRITICAL", statusBarColor: 'bg-red-600', percentage };
    }
    if (numericValue < safe || numericValue > (max - (max - safe) / 2)) {
        return { colorClass: WARNING_ORANGE, statusText: "WARNING", statusBarColor: 'bg-orange-500', percentage };
    }
    return { colorClass: NORMAL_GREEN, statusText: "NORMAL", statusBarColor: 'bg-green-500', percentage };
};


// --- Cute Doctor Companion (unchanged) ---
const DoctorCompanion = ({ status }) => {
    const isCritical = status.includes("CRITICAL");
    const isWarning = status.includes("WARNING");

    const color = isCritical ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-sky-500';
    const faceColor = 'fill-orange-200';
    const scrubColor = 'fill-sky-400';
    const hairColor = 'fill-gray-700';

    const animationName = 'doctor-float';
    const customStyles = `
        @keyframes ${animationName} {
            0%, 100% { transform: translateY(0) rotate(1deg); }
            50% { transform: translateY(-5px) rotate(-1deg); }
        }
    `;

    const StatusIcon = isCritical ? XCircle : isWarning ? AlertTriangle : CheckCircle;


    return (
        <div className="absolute top-1/2 left-4 md:left-8 -translate-y-1/2 z-20 hidden md:block" style={{ width: 80 }}>
            <style>{customStyles}</style>
            <div className={`animate-[${animationName}_6s_ease-in-out_infinite]`}>
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    {/* Stethoscope */}
                    <path d="M40 30 L50 45 L60 30" fill="none" stroke="#333" strokeWidth="3" />
                    <circle cx="65" cy="40" r="4" fill="#666" />

                    {/* Head */}
                    <circle cx="50" cy="30" r="18" className={faceColor} stroke="#333" strokeWidth="2" />
                    {/* Hair */}
                    <path d="M35 15 C 30 5, 70 5, 65 15 C 75 25, 75 40, 65 40" className={hairColor} />
                    {/* Eyes */}
                    <circle cx="43" cy="30" r="2" fill="#333" />
                    <circle cx="57" cy="30" r="2" fill="#333" />
                    {/* Mouth - changes with status */}
                    <path d={isCritical ? "M45 40 Q 50 35, 55 40" : "M45 40 Q 50 45, 55 40"} stroke="#333" strokeWidth="2" fill="none" />

                    {/* Body/Scrubs */}
                    <rect x="30" y="45" width="40" height="45" className={scrubColor} rx="5" ry="5" stroke="#333" strokeWidth="2" />
                    <rect x="45" y="55" width="10" height="25" fill="#fff" /> {/* Pocket/Badge */}

                    {/* Status Badge */}
                    <StatusIcon size={16} x="50" y="80" transform="translate(-8, 0)" className={color} fill="white" />
                </svg>
            </div>
        </div>
    );
};


const App = () => {
    const [data, setData] = useState(null);
    const [history, setHistory] = useState({
        temperature: [],
        vibration: [],
    });
    // NEW STATE: To store the user-set vibration duration (now in seconds)
    const [vibrationDurationSeconds, setVibrationDurationSeconds] = useState(10); // Default to 10 seconds
    const [settingStatus, setSettingStatus] = useState(null); // Feedback for API POST
    const [devicePowerStatus, setDevicePowerStatus] = useState("ON"); // Status for shutdown feature
    const [aiAnalysis, setAiAnalysis] = useState("Awaiting data for deep analysis..."); // AI State

    // Function to send the new setting to the backend
    const setVibrationSetting = async () => {
        setSettingStatus('Sending...');
        const durationMs = parseFloat(vibrationDurationSeconds) * 1000; // Convert Seconds to Milliseconds

        // Validation
        const durationSeconds = parseFloat(vibrationDurationSeconds);
        if (isNaN(durationSeconds) || durationSeconds < 10 || durationSeconds > 300) {
            setSettingStatus('Invalid duration (10s to 300s).');
            return;
        }

        try {
            const response = await axios.post("http://localhost:4000/api/settings/vibration", {
                duration: durationMs
            });
            setSettingStatus('Duration Saved!');
        } catch (error) {
            setSettingStatus('Error saving setting.');
            console.error("Error setting vibration duration:", error);
        }
        setTimeout(() => setSettingStatus(null), 3000); // Clear message after 3 seconds
    };

    // Function to send the device shutdown signal
    const sendDeviceControl = async (command) => {
        setSettingStatus(`Sending ${command}...`);
        try {
            const response = await axios.post("http://localhost:4000/api/control/power", {
                command: command
            });
            const newStatus = response.data.status;
            setDevicePowerStatus(command);
            setSettingStatus(newStatus);
        } catch (error) {
            setSettingStatus(`Error sending ${command} command.`);
            console.error(`Error sending ${command}:`, error);
        }
        setTimeout(() => setSettingStatus(null), 3000); // Clear message after 3 seconds
    };

    // NEW AI ANALYSIS FUNCTION
    const getAIAnalysis = async (currentData, status) => {
        // Rule-based fallback logic (for when the AI service fails)
        const getFallbackAnalysis = (temp, vib, ovStatus) => {
            if (ovStatus === 'CRITICAL') {
                if (parseFloat(temp) > 30) return "Fallback: Critical temperature elevation detected. Immediate offloading and medical attention are required.";
                if (parseFloat(vib) > 1.0) return "Fallback: Extreme vibration detected. Risk of tissue damage is high. Advise cessation of activity.";
            }
            if (ovStatus === 'WARNING') return "Fallback: Signal irregularity detected. Increase monitoring frequency and check device placement.";
            return "Fallback: Biosignals stable. Risk low. Monitoring remains essential.";
        };

        if (status === 'OFFLINE' || status === 'NO DATA') {
            setAiAnalysis("Awaiting sufficient sensor data for AI risk assessment.");
            return;
        }

        setAiAnalysis("AI Generating Clinical Risk Narrative...");

        try {
            const response = await axios.post("http://localhost:4000/api/ai/risk-analysis", {
                temperature: currentData.temperature,
                vibration: currentData.vibration,
                overallStatus: status
            });

            const analysisText = response.data.analysis;

            if (analysisText.includes("AI Error") || analysisText.includes("Service Connection Failure")) {
                // If AI fails, use the robust fallback
                setAiAnalysis(getFallbackAnalysis(currentData.temperature, currentData.vibration, status));
            } else {
                setAiAnalysis(analysisText);
            }

        } catch (error) {
            // If the entire API call fails (network issue), display a clean error
            setAiAnalysis("AI Service Error (Check Backend Console)");
            console.error("AI Request Failed:", error);
        }
    };


    useEffect(() => {
        // 1. Fetch live sensor data (tick function omitted for brevity, but still runs)
        const tick = async () => {
            let newData;
            try {
                const r = await axios.get("http://localhost:4000/api/sensors/latest");
                newData = r.data;
                // Check if data is actually being received
                if (newData && newData.devicePowerStatus) {
                    setDevicePowerStatus(newData.devicePowerStatus);
                }
                setData(newData);
            } catch (error) {
                newData = {
                    temperature: "CONN ERR",
                    pressure: "CONN ERR",
                    moisture: "CONN ERR",
                    vibration: "CONN ERR",
                    timestamp: "Server Offline"
                };
                setData(newData);
            }

            // Update historical data only if connected and data is valid
            if (newData && newData.temperature !== "CONN ERR" && !isNaN(parseFloat(newData.temperature))) {
                setHistory(prevHistory => {
                    const maxPoints = 15;
                    return {
                        temperature: [...prevHistory.temperature, { time: newData.timestamp, value: newData.temperature }].slice(-maxPoints),
                        vibration: [...prevHistory.vibration, { time: newData.vibration, value: newData.vibration }].slice(-maxPoints),
                    };
                });
            }
        };

        // Initial fetch of settings (if a GET /api/settings route existed, we'd call it here)
        // For now, we rely on the default 500ms set above.

        tick();
        const i = setInterval(tick, 1000);
        return () => clearInterval(i);
    }, []); // END of primary tick useEffect

    // NEW useEffect for AI Analysis (Runs when data changes)
    useEffect(() => {
        if (data) {
            const tempStatusData = getStatusData(data.temperature, 20, 30, 24);
            const pressureStatusData = getStatusData(data.pressure, 990, 1030, 1000);
            const moistureStatusData = getStatusData(data.moisture, 20, 70, 35);
            const vibrationStatusData = getStatusData(data.vibration, 0, 1.0, 0.2);

            const allStatuses = [tempStatusData, pressureStatusData, moistureStatusData, vibrationStatusData];
            const hasNoData = allStatuses.some(s => s.statusText === "NO DATA");

            const currentOverallStatus = allStatuses.find(s => s.statusText === "CRITICAL") ? "CRITICAL" :
                allStatuses.find(s => s.statusText === "WARNING") ? "WARNING" :
                    data.temperature === "CONN ERR" ? "OFFLINE" :
                        hasNoData ? "NO DATA" : "NORMAL";

            // Only request analysis when data is stable or critical/warning
            if (currentOverallStatus !== 'OFFLINE' && currentOverallStatus !== 'NO DATA') {
                getAIAnalysis(data, currentOverallStatus);
            } else if (currentOverallStatus === 'NO DATA') {
                setAiAnalysis("Awaiting initial sensor values for AI assessment.");
            }
        }
    }, [data]); // Run this effect when the primary data state changes

    if (!data) return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
            <h1 className="text-xl font-bold text-sky-600 animate-pulse">Establishing Biosignal Link...</h1>
        </div>
    );

    // Set clinically relevant thresholds for DPN monitoring
    const tempStatusData = getStatusData(data.temperature, 20, 30, 24);
    const pressureStatusData = getStatusData(data.pressure, 990, 1030, 1000);
    const moistureStatusData = getStatusData(data.moisture, 20, 70, 35);
    const vibrationStatusData = getStatusData(data.vibration, 0, 1.0, 0.2);

    const allStatuses = [tempStatusData, pressureStatusData, moistureStatusData, vibrationStatusData];

    // Global Status Logic
    const hasNoData = allStatuses.some(s => s.statusText === "NO DATA");

    const overallStatus = allStatuses.find(s => s.statusText === "CRITICAL") ? "CRITICAL" :
        allStatuses.find(s => s.statusText === "WARNING") ? "WARNING" :
            data.temperature === "CONN ERR" ? "OFFLINE" :
                hasNoData ? "NO DATA" : "NORMAL";

    // --- Analytics Calculation (Unchanged) ---
    const calculateAnalytics = (historyArray, label) => {
        const values = historyArray.map(item => parseFloat(item.value));
        if (values.length === 0) return { avg: "N/A", max: "N/A" };

        const sum = values.reduce((a, b) => a + b, 0);
        const avg = (sum / values.length).toFixed(2);
        const max = Math.max(...values).toFixed(2);
        return { avg, max };
    };

    const tempAnalytics = calculateAnalytics(history.temperature, "°C");
    const vibAnalytics = calculateAnalytics(history.vibration, "g");

    // Determine header/accent color based on device status
    const headerAccentColor = devicePowerStatus === "ON"
        ? (overallStatus === "CRITICAL" ? 'bg-red-600' : 'bg-sky-600')
        : 'bg-gray-500';


    return (
        <div className="min-h-screen w-full p-4 md:p-10 flex justify-center items-center bg-sky-50 font-sans relative">
            <BackgroundTelemetry />
            <DoctorCompanion status={overallStatus} />

            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">

                {/* COLUMN 1 & 2 (Main Dashboard View) */}
                <div className="lg:col-span-3 space-y-8 pl-0 md:pl-24"> {/* Added padding for doctor */}
                    <header className="bg-white p-6 rounded-2xl shadow-xl border border-sky-200">
                        <div className="flex items-center space-x-4 text-sky-600">
                            <Activity size={40} className="text-sky-500" />
                            <h1 className="text-4xl font-extrabold tracking-wide text-gray-800">
                                NeuroSole DPN Monitor
                            </h1>
                            <div className={`p-1 px-3 text-xs font-bold text-white rounded-full ml-auto ${headerAccentColor}`}>
                                DEVICE {devicePowerStatus}
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2 ml-14">
                            Real-time Clinical Biosignal Feed (Diabetic Peripheral Neuropathy)
                        </p>
                    </header>

                    {/* AI ANALYSIS PANEL (NEW) */}
                    <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100 border-l-4 border-l-sky-500">
                        <h3 className="text-lg font-bold text-sky-700 border-b border-gray-200 pb-2 mb-3 flex items-center space-x-2">
                            <Brain size={20} />
                            <span>AI Clinical Risk Narrative</span>
                        </h3>
                        <p className="text-sm text-gray-800 italic">
                            {aiAnalysis}
                        </p>
                    </div>


                    {/* ANALYTICAL DATA PANEL (Unchanged) */}
                    <div className="bg-white p-5 rounded-xl shadow-lg border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-700 border-b border-gray-200 pb-2 mb-4 flex items-center space-x-2">
                            <LineChart size={20} className="text-sky-500" />
                            <span>Recent Signal Analysis (Last 15 readings)</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="border-r pr-4">
                                <p className="text-xs text-gray-500 uppercase">Avg Temp (°C) / Max Temp (°C)</p>
                                <p className="text-2xl font-extrabold text-sky-700">{tempAnalytics.avg} / {tempAnalytics.max}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase">Avg Vib (g) / Max Vib (g)</p>
                                <p className="text-2xl font-extrabold text-sky-700">{vibAnalytics.avg} / {vibAnalytics.max}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SensorCard
                            title="SKIN TEMPERATURE"
                            value={data.temperature}
                            unit="°C"
                            icon={Thermometer}
                            history={history.temperature}
                            {...tempStatusData}
                        />
                        <SensorCard
                            title="VIBRATION PERCEPTION"
                            value={data.vibration}
                            unit="g"
                            icon={Zap}
                            history={history.vibration}
                            {...vibrationStatusData}
                        />
                        <SensorCard
                            title="FOOT PRESSURE (Balance)"
                            value={data.pressure}
                            unit="hPa"
                            icon={Gauge}
                            history={[]}
                            {...pressureStatusData}
                        />
                        <SensorCard
                            title="SKIN MOISTURE (Hydration)"
                            value={data.moisture}
                            unit="%"
                            icon={Droplet}
                            history={[]}
                            {...moistureStatusData}
                        />
                    </div>
                </div>

                {/* COLUMN 3 (Vertical Status/Companion Panel) */}
                <div className="lg:col-span-1 space-y-8 p-6 bg-white rounded-2xl shadow-xl border border-sky-200 h-fit">

                    <h2 className="text-lg font-bold text-sky-600 border-b border-sky-200 pb-2">CLINICAL STATUS</h2>

                    {/* Interactive Element */}
                    <BiosignalMonitor status={overallStatus} />

                    {/* DEVICE CONTROL SECTION */}
                    <div className="space-y-3 pt-2 p-3 border border-dashed border-sky-300 rounded-lg">
                        <h3 className="text-sm font-bold text-sky-700 flex items-center space-x-2">
                            <Power size={18} /><span>Device Control</span>
                        </h3>
                        <p className="text-xs text-gray-500">
                            Current Status: <span className={`font-semibold ${devicePowerStatus === 'ON' ? 'text-green-500' : 'text-red-500'}`}>{devicePowerStatus}</span>
                        </p>

                        {/* New ON/OFF buttons */}
                        <div className="flex space-x-2">
                            {/* ON Button (Green, when OFF) */}
                            <button
                                onClick={() => sendDeviceControl('ON')}
                                className="flex-grow bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                                disabled={devicePowerStatus === 'ON' || settingStatus === 'Sending ON...'}
                            >
                                <Power size={16} /><span>{devicePowerStatus === 'ON' ? 'DEVICE IS ON' : 'TURN ON'}</span>
                            </button>

                            {/* OFF Button (Slate/Gray, when ON) */}
                            <button
                                onClick={() => sendDeviceControl('OFF')}
                                className={`flex-grow ${CONTROL_OFF} text-white py-2 rounded-lg text-sm font-semibold hover:bg-slate-700 transition disabled:opacity-50 flex items-center justify-center space-x-2`}
                                disabled={devicePowerStatus === 'OFF' || settingStatus === 'Sending OFF...'}
                            >
                                <Power size={16} /><span>{devicePowerStatus === 'OFF' ? 'DEVICE IS OFF' : 'TURN OFF'}</span>
                            </button>
                        </div>
                    </div>

                    {/* VIBRATION SETTINGS (Updated Range) */}
                    <div className="space-y-3 pt-2 p-3 border border-dashed border-sky-300 rounded-lg">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center space-x-2">
                            <Settings size={18} /><span>Vibration Settings</span>
                        </h3>
                        <p className="text-xs text-gray-500">Set haptic feedback duration (10s to 300s).</p>

                        <div className="flex space-x-2 items-center">
                            <input
                                type="number"
                                step="1" // Step by whole seconds
                                value={vibrationDurationSeconds}
                                onChange={(e) => setVibrationDurationSeconds(e.target.value)}
                                className="w-1/2 p-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 text-sm"
                                placeholder="Seconds (s)"
                                min="10"
                                max="300"
                            />
                            <button
                                onClick={setVibrationSetting}
                                className="flex-grow bg-sky-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-sky-600 transition disabled:opacity-50"
                                disabled={settingStatus && settingStatus.includes('Sending...')}
                            >
                                {settingStatus && settingStatus.includes('Saved') ? settingStatus : 'Set Duration'}
                            </button>
                        </div>
                    </div>


                    {/* Status Summary */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center space-x-3 text-gray-800">
                            <TrendingUp size={24} className={overallStatus === "NORMAL" ? "text-green-500" : "text-red-500 animate-pulse"} />
                            <div>
                                <p className="text-sm font-semibold text-gray-500">Neuropathic Risk</p>
                                <p className={`text-xl font-extrabold ${overallStatus === "NORMAL" ? "text-green-500" : overallStatus === "WARNING" ? "text-orange-500" : overallStatus === "CRITICAL" ? "text-red-600" : "text-gray-600"}`}>
                                    {overallStatus}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 text-gray-800">
                            <Clock size={24} className="text-sky-500" />
                            <div>
                                <p className="text-sm font-semibold text-gray-500">Last Biosignal Stamp</p>
                                <p className="text-lg font-mono text-gray-800">{data.timestamp}</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Diagnostics */}
                    <h2 className="text-sm font-bold text-gray-500 border-b border-gray-200 pt-4 pb-2">SYSTEM DIAGNOSTICS</h2>
                    <ul className="text-sm space-y-2 text-gray-700">
                        <li className="flex justify-between items-center">
                            <span>Data Persistence:</span>
                            <span className="font-mono text-green-500">ACTIVE</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <span>API Latency:</span>
                            <span className="font-mono text-orange-500">~20ms</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <span>Device IP:</span>
                            <span className="font-mono text-gray-500">10.1.12.176</span>
                        </li>
                    </ul>
                </div>

            </div>
        </div>
    );
};

export default App;
