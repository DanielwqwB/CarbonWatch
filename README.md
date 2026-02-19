# Carbon Emission Tracker

A comprehensive mobile application for monitoring, analyzing, and reducing carbon emissions across multiple facilities and locations. Built with React Native and Expo, this app provides real-time tracking, AI-powered predictions, and actionable insights for environmental sustainability.

---

## Features

### Interactive Map View
- Real-time visualization of all monitored facilities
- Color-coded markers based on emission levels (Green / Yellow / Red)
- Facility details with emission data and status
- Geolocation support for nearby facilities

### Comprehensive Dashboard
- City-wide emission statistics
- Facility performance rankings
- Quick access to high-emission alerts
- Real-time data synchronization

### Advanced Reporting
- **Monthly Reports**: Year-round emission trends and analysis
- **Weekly Reports**: Short-term performance tracking
- Carbon emission breakdown by location
- Visual charts and graphs (bar charts, pie charts)
- Actionable insights and recommendations
- Exportable reports

### AI-Powered Predictions
- **Weekly Predictions**: 7-day temperature and emission forecasts
- **Monthly Predictions**: Long-term emission projections
- Temperature correlation analysis
- Trend comparison with historical data

### Places Management
- Complete facility directory
- Emission level filtering (All / Green / Yellow / Red)
- Detailed facility information
- Quick navigation to facility locations

---

## Technology Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation 6
- **Charts**: react-native-chart-kit
- **Maps**: react-native-maps
- **Icons**: @expo/vector-icons (Ionicons, MaterialCommunityIcons)
- **State Management**: React Hooks (useState, useEffect)
- **HTTP Client**: Fetch API

---

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Studio (for Android emulation)
- Expo Go app (for physical device testing)

---

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/carbon-emission-tracker.git
   cd carbon-emission-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure the API endpoint**

   Update the API URL in your environment or configuration files:
   ```javascript
   // Update in respective component files
   const API_URL = 'https://your-api-endpoint.com';
   ```

4. **Start the development server**
   ```bash
   npm start
   # or
   expo start
   ```

5. **Run on your device**
   - Scan the QR code with Expo Go (Android) or the Camera app (iOS)
   - Or press `i` for the iOS simulator or `a` for the Android emulator

---

## App Structure

```
carbon-emission-tracker/
├── screens/
│   ├── Map.jsx              # Interactive map view
│   ├── Dashboard.jsx        # Main dashboard
│   ├── Reports.jsx          # Reporting with monthly/weekly toggle
│   ├── Prediction.jsx       # AI predictions
│   └── Places.jsx           # Facility directory
├── components/              # Reusable components
├── assets/                  # Images, icons, fonts
├── navigation/              # Navigation configuration
└── App.js                   # Main app entry point
```

---

## Color Coding System

The app uses a color-coded system to represent emission levels:

| Color  | Emission Level | CO2 Range    |
|--------|----------------|--------------|
| Green  | Low            | <= 20 tons   |
| Yellow | Medium         | 21–50 tons   |
| Red    | High           | > 50 tons    |

---

## Key Metrics Tracked

- **Total CO2 Emissions**: Measured in tons
- **Facility Count**: Number of monitored locations
- **Emission Trends**: Month-over-month and week-over-week comparisons
- **Temperature Correlation**: Weather impact on emissions
- **Location Distribution**: Emission breakdown by facility

---

## Configuration

### API Integration

Update the API endpoints in each component:

```javascript
// Reports.jsx
const API_URL = '${API_URL}/reports';

// Dashboard.jsx
const API_URL = '${API_URL}/dashboard';

// Places.jsx
const API_URL = '${API_URL}/places';
```

### Map Configuration

Configure your map region in `Map.jsx`:

```javascript
const initialRegion = {
  latitude: 13.7565,    // Default latitude
  longitude: 121.0583,  // Default longitude
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};
```

---

## API Response Format

### Expected Structure

```json
{
  "establishments": [
    {
      "id": "1",
      "name": "San Francisco Facility",
      "address": "123 Green St, SF, CA",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "co2_emission": 45.5,
      "status": "active",
      "last_updated": "2026-02-12T10:00:00Z"
    }
  ],
  "total_emissions": 300,
  "target": 375,
  "trend": {
    "value": 5,
    "direction": "up"
  }
}
```

---

## Troubleshooting

**Charts not rendering**
```bash
expo start -c
npm install react-native-chart-kit --save
```

**Map markers not showing**
- Ensure location permissions are granted
- Verify the API returns valid latitude/longitude values
- Check map API key configuration

**API connection errors**
- Verify the API endpoint is accessible
- Check network connectivity
- Review CORS settings on the backend

---

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## Authors

- Galvez, J.R.
- Bonito, D.
- Cambiado, J.P.
- Sanota, J.R.
- Nodado, R.L.

---

## Acknowledgments

- React Native community for excellent documentation
- Expo team for the development platform
- Contributors to react-native-chart-kit and react-native-maps
- Environmental sustainability initiatives that inspired this project

---

## Contact and Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/carbon-emission-tracker/issues)
- **Email**: your.email@example.com
- **Website**: https://yourwebsite.com

---

## Future Enhancements

- Real-time notifications for emission spikes
- Historical data export (CSV, PDF)
- Multi-language support
- Dark mode theme
- Offline mode with local caching
- Integration with IoT sensors
- Carbon offset recommendations
- Team collaboration features
- Custom alert thresholds
- Advanced analytics dashboard

### Version 2.0 Roadmap

- Machine learning-based anomaly detection
- Integration with third-party carbon credit platforms
- Enhanced AI prediction models
- Social sharing features

---

*Made for a sustainable future.*
