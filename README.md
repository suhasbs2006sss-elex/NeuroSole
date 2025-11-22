#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Essential for creating and parsing JSON data
#include <OneWire.h>
#include <DallasTemperature.h>

// =======================================================
// PART 1: NETWORK & SERVER CONFIGURATION
// =======================================================

// --- Your Wi-Fi details (Extracted from your current code) ---
const char* ssid     = "Nothing Phone 3a";     // Your Wi-Fi Name
const char* password = "suhassuhas";  // Your Wi-Fi Password

// --- Your Computer's IP Address (10.50.208.73 confirmed from your URL) ---
const char* serverHost = "10.50.208.73"; 
const int serverPort = 4000; 

// --- API Endpoints ---
const char* DATA_POST_PATH    = "/api/sensors/data";
const char* CONTROL_GET_PATH  = "/api/control/power";
const char* SETTINGS_GET_PATH = "/api/settings/vibration";

// =======================================================
// PART 2: DEVICE VARIABLES & PINS
// =======================================================

// --- PINS (Based on your definitions) ---
#define ONE_WIRE_BUS 4 
#define PRESSURE_PIN 32
const int MOISTURE_PIN = 34;
const int VIB_MOTOR_PIN = 2; // GPIO 2 for motor control

// --- SENSORS & Libraries ---
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// --- Calibration Values (from your code) ---
int AIR_VALUE     = 3500;
int WATER_VALUE   = 1500;

// --- Current Sensor Readings (Stored as floats for dashboard) ---
float footTemperature = 0.0;
float footPressure = 0.0;
float skinMoisture = 0.0;
float vibrationValue = 0.0; // PLACEHOLDER: We must send this to match the backend API!

// --- Control Variables Received from Server ---
long currentVibrationDuration = 10000; // Default: 10 seconds (10000 ms)
String devicePowerCommand = "ON"; // Tracks status from dashboard

// =======================================================
// PART 3: SETUP AND LOOP (Integrated Flow)
// =======================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\nESP32: NeuroSole Monitoring Client\n");
  
  pinMode(VIB_MOTOR_PIN, OUTPUT); 
  
  connectToWiFi();
  sensors.begin();
  
  Serial.print("DS18B20 Sensors Found: ");
  Serial.println(sensors.getDeviceCount());
  analogReadResolution(12);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi lost. Reconnecting...");
    connectToWiFi();
    return;
  }

  // 1. READ ALL SENSORS
  readSensors(); 
  
  // 2. CHECK CONTROL STATUS (Device ON/OFF)
  getDeviceControlStatus();

  // 3. IF DEVICE IS ON, SEND DATA AND CHECK FOR SETTINGS
  if (devicePowerCommand == "ON") {
    sendSensorData();
    getVibrationSetting(); // Check for setting updates from dashboard
  } else {
    // If command is OFF, keep motor off and wait longer
    digitalWrite(VIB_MOTOR_PIN, LOW);
    Serial.println("[CONTROL] Device OFF command received. Sleeping...");
    delay(10000); 
    return;
  }
  
  // 4. ACTIVATE MOTOR (Example logic, uses user-set duration)
  if (vibrationValue > 0.5) {
      activateVibrationAlert(currentVibrationDuration);
  }
  
  delay(1000); // Send data roughly once per second
}

// =======================================================
// PART 4: DATA READING & NETWORKING FUNCTIONS
// =======================================================

// --- Your Data Reading Logic (Updated to set all 4 values) ---
void readSensors() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  
  // Read Moisture
  int moistureRaw = analogRead(MOISTURE_PIN);
  int constrainedValue = constrain(moistureRaw, WATER_VALUE, AIR_VALUE);
  skinMoisture = map(constrainedValue, AIR_VALUE, WATER_VALUE, 0, 100);
  skinMoisture = constrain(skinMoisture, 0, 100);

  // Read Pressure (your calibration)
  int pressureRaw = analogRead(PRESSURE_PIN);
  footPressure = pressureRaw - 1750; 
  
  // Set the global variables for the payload
  footTemperature = tempC;
  // NOTE: You are missing a physical VIBRATION sensor, so we simulate it here
  vibrationValue = (random(0, 100) / 200.0); 

  Serial.print("T: "); Serial.print(footTemperature);
  Serial.print(", P: "); Serial.print(footPressure);
  Serial.print(", V: "); Serial.println(vibrationValue);
}

void connectToWiFi() {
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected!");
  Serial.print("ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

// --- Combined Data Sending Function (POST) ---
void sendSensorData() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String serverUrl = "http://" + String(serverHost) + ":" + String(serverPort) + String(DATA_POST_PATH);
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  // Build the JSON Payload (MUST contain all 4 fields)
  StaticJsonDocument<200> doc;
  doc["temperature"] = footTemperature;
  doc["pressure"] = footPressure;
  doc["moisture"] = skinMoisture;
  doc["vibration"] = vibrationValue; // Now included
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);

  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    Serial.print("Data POST Success, Code: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.printf("Data POST Failed, Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  http.end();
}

// --- Control Signal Retrieval (GET /api/control/power) ---
void getDeviceControlStatus() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String serverUrl = "http://" + String(serverHost) + ":" + String(serverPort) + String(CONTROL_GET_PATH);
  http.begin(serverUrl);

  int httpCode = http.GET();
  if (httpCode > 0) {
    String payload = http.getString();
    
    StaticJsonDocument<100> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      String newCommand = doc["command"].as<String>();
      if (newCommand != devicePowerCommand) {
          Serial.print("[CONTROL] Status Change: ");
          Serial.println(newCommand);
          devicePowerCommand = newCommand;
      }
    } 
  }
  http.end();
}

// --- Settings Retrieval (GET /api/settings/vibration) ---
void getVibrationSetting() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String serverUrl = "http://" + String(serverHost) + ":" + String(serverPort) + String(SETTINGS_GET_PATH);
  http.begin(serverUrl);

  int httpCode = http.GET();
  if (httpCode > 0) {
    String payload = http.getString();
    
    StaticJsonDocument<100> doc;
    DeserializationError error = deserializeJson(doc, payload);

    if (!error) {
      long newDuration = doc["duration"].as<long>();
      if (newDuration != currentVibrationDuration) {
          Serial.print("[SETTINGS] Duration Updated to: ");
          Serial.print(newDuration);
          Serial.println("ms");
          currentVibrationDuration = newDuration;
      }
    } 
  } 
  http.end();
}

// --- Motor Activation ---
void activateVibrationAlert(long durationMs) {
  Serial.print("[ALERT] Activating Motor for ");
  Serial.print(durationMs);
  Serial.println("ms (User Setting)");
  
  digitalWrite(VIB_MOTOR_PIN, HIGH); 
  delay(durationMs);     
  digitalWrite(VIB_MOTOR_PIN, LOW);  
}
