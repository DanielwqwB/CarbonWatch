#include "DHT.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "time.h"

// ---------- DHT22 ----------
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ---------- MQ-2 ----------
const int sensorPin = 34;
const float Vcc = 5.0;
const float R_L = 10000.0;
const float Ro = 10000.0;
const float ADC_MAX = 4095.0; 

// ---------- WiFi ----------
const char* ssid = "wifi";
const char* password = "password";
const char* serverUrl = "https://bytetech-final1.onrender.com/create/sensor-data";

// ---------- Sensor Info ----------
const int sensor_id = 1;
const int barangay_id = 4;

// ---------- NTP ----------
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 8 * 3600;   
const int   daylightOffset_sec = 0;

void setup() {
  Serial.begin(115200);
  dht.begin();

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  Serial.println(WiFi.localIP());

  // ------ NTP ------
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  Serial.println("Waiting for NTP time sync...");
  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nTime synchronized.");
}

void loop() {

  if (WiFi.status() != WL_CONNECTED) return;

  // ---------- MQ-2 ----------
  int adcReading = analogRead(sensorPin);
  float Vout = (adcReading / ADC_MAX) * Vcc;
  if (Vout <= 0) Vout = 0.0001;

  float Rs = R_L * (Vcc / Vout - 1);
  float RsRo = Rs / Ro;

  float ppm = 1000.0 * pow(RsRo, -2.3);
  float mg_per_m3 = ppm * 16.04 / 24.45;
  float co2_density = (mg_per_m3 / 1000.0) * (44.01 / 16.04);

  // ---------- Carbon Level ----------
  String carbon_level;
  if (co2_density < 0.08) carbon_level = "LOW";
  else if (co2_density < 0.15) carbon_level = "NORMAL";
  else if (co2_density < 0.20) carbon_level = "HIGH";
  else carbon_level = "VERY HIGH";

  // ---------- DHT22 ----------
  float humidity = dht.readHumidity();
  float temperature_c = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature_c)) {
    Serial.println("DHT read failed");
    delay(2000);
    return;
  }

  float heat_index_c = dht.computeHeatIndex(temperature_c, humidity, false);

  // ---------- Get Current Time ----------
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    delay(2000);
    return;
  }

  char minuteStamp[20];
  strftime(minuteStamp, sizeof(minuteStamp), "%Y-%m-%d %H:%M:00", &timeinfo);

  // ---------- HTTP ----------
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> json;
  json["sensor_id"] = sensor_id;
  json["barangay_id"] = barangay_id;
  json["co2_density"] = co2_density;
  json["temperature_c"] = temperature_c;
  json["humidity"] = humidity;
  json["heat_index_c"] = heat_index_c;
  json["carbon_level"] = carbon_level;
  json["minute_stamp"] = minuteStamp;  

  String requestBody;
  serializeJson(json, requestBody);

  int httpResponseCode = http.POST(requestBody);

  Serial.print("HTTP Response: ");
  Serial.println(httpResponseCode);
  
  http.end();
  delay(60000);
}
