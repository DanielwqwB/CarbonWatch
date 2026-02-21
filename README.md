# CarbonWatch

A full-stack air quality monitoring system for tracking, analyzing, and predicting CO2 emissions across establishments and barangay sensor nodes in Naga City. The system spans four components in this repository: an IoT sensor device, a Node.js backend API, a Python AI prediction service, and a React Native mobile application.

---

## Repository Structure

```
CarbonWatch/
├── IoT code/
│   └── CarbonWatch.c++          # Embedded firmware for the physical sensor node
├── Backend/
│   ├── app.js                   # Express application entry point
│   ├── index.js                 # Server bootstrap
│   ├── config/                  # Database and environment configuration
│   ├── controllers/             # Route handler logic
│   └── routes/                  # API route definitions
├── Ai Prediction/
│   ├── api.py                   # FastAPI service exposing prediction endpoints
│   ├── train_and_predict.py     # Model training and inference logic
│   ├── scheduler.py             # Automated retraining scheduler
│   ├── config.py                # Service configuration
│   ├── app/                     # Additional API modules
│   ├── saved_models/            # Persisted trained model files
│   ├── training/                # Training datasets and scripts
│   ├── dockerfile               # Container definition for the prediction service
│   ├── render.yaml              # Render.com deployment configuration
│   └── requirements.txt         # Python dependencies
└── Frontend/
    ├── Map.js                   # Interactive map, navigation shell, feedback modal
    ├── dashboard.js             # Metrics dashboard with month selection
    ├── reports.js               # Monthly/weekly reports with PDF export
    ├── prediction.js            # AI prediction viewer with Bicol translation
    ├── Establishments.js        # Establishment directory with safe hours view
    ├── Calendarpicker.js        # Shared month/year picker component
    ├── SettingsScreen.js        # User preferences (temperature unit, etc.)
    └── assets/
        ├── image.png            # App logo
        └── cert.png             # Clean Air Certified badge
```

---

## System Overview

Physical MQ-135 or equivalent CO2 sensors run the firmware in `IoT code/` and transmit readings to the Node.js backend. The backend stores readings and exposes REST endpoints consumed by both the mobile app and the AI prediction service. The prediction service trains on historical sensor data on a schedule and serves forecasts and AI-generated insights through its own FastAPI endpoints. The React Native frontend ties all of this together for end users.

---

## Components

### IoT Sensor (`IoT code/CarbonWatch.c++`)

Embedded C++ firmware that reads CO2, temperature, and humidity from connected sensors and transmits the data to the backend API at a configured interval. Deployed on a microcontroller (ESP32 or compatible).

### Backend (`Backend/`)

A Node.js/Express REST API that receives sensor telemetry, stores it, and serves it to the frontend and AI service.

**Tech stack:** Node.js, Express, structured into `config/`, `controllers/`, and `routes/` layers.

**Deployed at:** `https://bytetech-final1.onrender.com`

| Endpoint | Purpose |
|---|---|
| `GET /sensor` | All registered sensor nodes with metadata |
| `GET /sensor-data` | Full time-series sensor readings |
| `GET /establishment` | Establishment directory with averaged metrics |
| `POST /create/feedback` | Accept user feedback submissions from the app |

### AI Prediction Service (`Ai Prediction/`)

A Python FastAPI service that trains machine learning models on historical sensor data and exposes prediction and insight endpoints. A scheduler (`scheduler.py`) handles periodic model retraining. Models are saved to `saved_models/` and loaded at inference time.

**Tech stack:** Python, FastAPI, containerized via Docker, deployed on Render.com via `render.yaml`.

**Deployed at:** `https://ai-prediction-jwnp.onrender.com`

| Endpoint | Purpose |
|---|---|
| `GET /api/predictions/history?node_id={id}` | Prediction history for a specific sensor node |
| `GET /api/insights/latest` | Latest AI-generated insight summary |
| `GET /api/realtime/insight/history?limit=5` | Recent real-time insight records for reports |

### Frontend (`Frontend/`)

A React Native mobile application built with Expo, providing five screens for map visualization, dashboard metrics, reporting, AI predictions, and an establishment directory.

**Tech stack:**

| Layer | Library |
|---|---|
| Framework | React Native with Expo |
| Navigation | React Navigation 6 |
| Maps | react-native-maps (Google Maps provider) |
| Charts | react-native-chart-kit |
| Icons | @expo/vector-icons (Ionicons, MaterialCommunityIcons), lucide-react-native, Feather |
| Location | expo-location |
| Gradients | expo-linear-gradient |
| Local storage | @react-native-async-storage/async-storage |
| PDF export | expo-print, expo-sharing |
| Translation | OpenAI API (gpt-4o-mini) |

---

## Frontend Screens

### Map

Real-time visualization of all sensor nodes on a Google Maps base layer centered on Naga City (13.6218 N, 123.1948 E). Markers are color-coded by current CO2 severity. Tapping a marker expands a detail panel showing CO2 density, temperature, humidity, heat index, and severity label. Includes a search bar, user geolocation, and an in-app feedback modal that posts directly to the backend.

### Dashboard

Month-scoped summary of sensor network metrics. Displays average temperature (Celsius or Fahrenheit based on user settings), humidity, CO2 density, and heat index in metric cards. A pill row shows sensor counts per severity level. The ranked barangay list sorts nodes by CO2 density with color-coded progress bars and a month-over-month comparison badge.

### Reports

Toggles between monthly and weekly views. Renders a bar chart of CO2 readings per sensor and a severity breakdown table. AI-generated insights from the prediction service are parsed into labeled sections: Current Status, Resident Advisory, Business Advisory, Authorities, and Action Steps. Reports can be exported to PDF using `expo-print` and shared via `expo-sharing`.

### AI Predictions

Displays per-node prediction history fetched from the AI service. A node selector modal allows searching and switching between sensors. Weekly and monthly forecast tabs show projected CO2 density. Insight text can be translated into Bicol (Bikol) via the OpenAI GPT-4o mini API using the language toggle button, making results accessible to local residents in their native language.

### Establishments

A directory of registered establishments with filter tabs by severity level (All / Low / Moderate / High / Very High). Each card shows the establishment type (inferred from name keywords), current CO2 badge, temperature, and percentage change from the previous reading, with a button to open the location in the native maps app. The Safe Hours sub-view shows a per-hour CO2 timeline for the current day, highlighting Low-emission windows as recommended visiting times. Qualifying establishments display a Clean Air Certified badge. The header shows a time-of-day contextual tip and an animated live-data pulse indicator. Data auto-refreshes every 30 seconds.

---

## Demo


https://github.com/user-attachments/assets/41f805df-f9e5-4ba1-8ec6-e56ba0b164dc


---

## Emission Level Classification

| Level | Hex | Description |
|---|---|---|
| Low | `#3B82F6` | CO2 within safe ambient range |
| Moderate | `#F59E0B` | Elevated; short visits acceptable with ventilation |
| High | `#E8A75D` | Use caution; limit exposure time |
| Very High | `#D64545` | Avoid; dangerously elevated CO2 |

---

## Setup and Installation

### Prerequisites

- Node.js v14 or higher
- Python 3.9 or higher
- Docker (for running the AI prediction service locally)
- Expo CLI: `npm install -g expo-cli`
- Expo Go on a physical device, or an iOS Simulator / Android Emulator
- An OpenAI API key (required for Bicol translation in the Predictions screen)

### Backend

```bash
cd Backend
npm install
node index.js
```

Configure your database connection in `config/` before starting.

### AI Prediction Service

```bash
cd "Ai Prediction"
pip install -r requirements.txt
python api.py
```

Or run via Docker:

```bash
docker build -t carbonwatch-ai .
docker run -p 8000:8000 carbonwatch-ai
```

To train or retrain models manually:

```bash
python train_and_predict.py
```

### Frontend

```bash
cd Frontend
npm install
```

Set your OpenAI API key in `prediction.js`:

```js
const OPENAI_API_KEY = 'your-openai-api-key-here';
```

Start the development server:

```bash
expo start
```

Scan the QR code with Expo Go, or press `i` for the iOS simulator or `a` for the Android emulator.

---

## Configuration

**Map region** — update `NAGA_CITY_CENTER` in `Map.js` to reposition the default map view:

```js
const NAGA_CITY_CENTER = {
  latitude: 13.6218,
  longitude: 123.1948,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
```

**Temperature unit** — users toggle between Celsius and Fahrenheit from the Settings screen. The preference is persisted under the `AsyncStorage` key `@envi_settings`.

**Establishment refresh interval** — the Establishments screen polls for new data every 30 seconds. Adjust in `Establishments.js`:

```js
const REFRESH_INTERVAL_MS = 30_000;
```

**Certified badge threshold** — approximately 40% of establishments receive the Clean Air Certified badge, assigned via a deterministic hash of each establishment ID. Adjust the threshold in `Establishments.js`:

```js
return (hash % 10) < 4;
```

---

## Troubleshooting

**Charts not rendering**

```bash
expo start -c
npm install react-native-chart-kit --save
```

**Map markers not appearing**

Confirm the `/sensor` endpoint returns valid numeric `latitude` and `longitude` values. Verify location permissions are granted on the device. On Android, ensure a valid Google Maps API key is set in `app.json` or `google-services.json`.

**API connection errors**

Both backend services are hosted on Render.com free-tier instances, which spin down after inactivity. The first request following a cold start may take 30–60 seconds. Subsequent requests will respond normally.

**Bicol translation not working**

Verify the OpenAI API key in `prediction.js` is valid and has remaining quota. The translation call targets `gpt-4o-mini` with a 1000-token response limit.

**PDF export failing**

Ensure `expo-print` and `expo-sharing` are installed. On Android, confirm storage permissions are granted when prompted.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request.

---

## Authors

•	**John Roy V. Galvez** is the Team Leader, robotics-focused engineer, educator, and international AI challenge champion and researcher.
  - LinkedIn: https://www.linkedin.com/in/johnroy-galvez/?skipRedirect=true
  - Facebook: https://www.facebook.com/jroy.17

•	**John Paul Cambiado** is a Backend Developer, 3rd-year BS Computer Science student at Naga College Foundation Inc., and active student leader.
  - LinkedIn: https://www.linkedin.com/in/john-paul-cambiado-68284b324/
  - Facebook: https://www.facebook.com/johnpaul.cambiado.1

•   **Daniel Bonito** is a Frontend Developer, 3rd-year BS Computer Science student, and President of Panthera Tigris Game Developers Association.
  - LinkedIn: www.linkedin.com/in/daniel-bonito-71695531b
  - Facebook: https://www.facebook.com/me.xxBASE24MANxx

•	**Lawrence Nodado** is a 3rd-year BS Computer Science student specializing in AI integration.
  - LinkedIn: https://www.linkedin.com/in/rey-lawrence-nodado-1604743b2
  - Facebook: https://www.facebook.com/lawrence.nodado.2024

•	**Joshua Rovic Sanota** is a 3rd-year BS Computer Science student specializing in IoT and hardware integration, and Auditor of Panthera Tigris Game Developers Association.
  - LinkedIn: https://ph.linkedin.com/in/joshua-rovic-sanota-7426063b2
  - Facebook: https://www.facebook.com/juswaaa25
---

## Acknowledgments

React Native and Expo communities for documentation and tooling. Contributors to `react-native-chart-kit` and `react-native-maps`. OpenAI for the translation API. Environmental monitoring initiatives in the Bicol Region that motivated this project.

---

## Planned Enhancements

- Real-time push notifications for emission spikes
- CSV and PDF historical data export
- Offline mode with local caching
- Dark mode theme
- Multi-language support beyond Bicol
- Machine learning anomaly detection
- Integration with third-party carbon credit platforms
- Advanced analytics and custom alert thresholds
