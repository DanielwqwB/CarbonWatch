import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, StatusBar,
  Dimensions, Image, TextInput, FlatList
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Icons from 'lucide-react-native';

// Screen Imports
import DashboardScreen from './dashboard';
import ReportsScreen from './reports';
import PredictionScreen from './prediction';
import PlacesScreen from './Establishments';

const { width } = Dimensions.get('window');
const LOGO_IMG = require('./assets/image.png');

const SENSOR_API      = 'https://bytetech-final1.onrender.com/sensor';
const SENSOR_DATA_API = 'https://bytetech-final1.onrender.com/sensor-data';

const NAGA_CITY_CENTER = {
  latitude: 13.6218,
  longitude: 123.1948,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// ─── Carbon level → colour ────────────────────────────────────────────────────
const getCarbonColor = (level) => {
  if (!level) return '#6CAE75';
  switch (level.toUpperCase()) {
    case 'VERY HIGH': return '#D64545';
    case 'HIGH':      return '#E8A75D';
    case 'MODERATE':  return '#F59E0B';
    case 'LOW':       return '#3B82F6';
    default:          return '#6CAE75'; // NORMAL
  }
};

const SafeIcon = ({ name, size = 24, color = '#000' }) => {
  const IconComponent = Icons[name];
  return IconComponent ? <IconComponent size={size} color={color} /> : <View />;
};

const MapScreen = () => {
  const mapRef = useRef(null);
  const [currentTab, setCurrentTab]           = useState('Map');
  const [selectedSensor, setSelectedSensor]   = useState(null);
  const [mergedSensors, setMergedSensors]     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');
  const [filteredResults, setFilteredResults] = useState([]);

  useEffect(() => {
    fetchAllData();
    setupLocation();
  }, []);

  const setupLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      () => {}
    );
  };

  // ── Fetch both endpoints, join by sensor_id ───────────────────────────────
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [sensorRes, dataRes] = await Promise.all([
        fetch(SENSOR_API),
        fetch(SENSOR_DATA_API),
      ]);

      // /sensor  → plain array
      const sensorList = await sensorRes.json();

      // /sensor-data → { success, total, data: [...] }
      const dataJson = await dataRes.json();
      const dataList = Array.isArray(dataJson) ? dataJson : (dataJson.data || []);

      // Build lookup: sensor_id → reading
      const dataMap = {};
      dataList.forEach(d => { dataMap[d.sensor_id] = d; });

      // Merge: location info + live reading
      const merged = (Array.isArray(sensorList) ? sensorList : []).map(s => ({
        ...s,
        ...(dataMap[s.sensor_id] || {}),
      }));

      setMergedSensors(merged);
    } catch (err) {
      console.error('fetchAllData error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length > 0) {
      setFilteredResults(
        mergedSensors.filter(s =>
          (s.barangay_name || '').toLowerCase().includes(text.toLowerCase()) ||
          (s.sensor_name   || '').toLowerCase().includes(text.toLowerCase())
        )
      );
    } else {
      setFilteredResults([]);
    }
  };

  const selectSearchResult = (item) => {
    mapRef.current?.animateToRegion({
      latitude:       parseFloat(item.latitude),
      longitude:      parseFloat(item.longitude),
      latitudeDelta:  0.01,
      longitudeDelta: 0.01,
    }, 1000);
    setSearchQuery('');
    setFilteredResults([]);
    setSelectedSensor(item);
  };

  // ── Map content ───────────────────────────────────────────────────────────
  const renderMapContent = () => (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={NAGA_CITY_CENTER}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => {
          setSelectedSensor(null);
          setFilteredResults([]);
        }}
      >
        {mergedSensors.map((sensor) => {
          const lat = parseFloat(sensor.latitude);
          const lng = parseFloat(sensor.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={`s-${sensor.sensor_id}`}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => setSelectedSensor(sensor)}
            >
              <View style={[
                styles.customMarker,
                { borderColor: getCarbonColor(sensor.carbon_level) },
              ]}>
                <Image source={LOGO_IMG} style={styles.markerLogo} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icons.Search size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search barangay..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.searchLocateBtn}
            onPress={async () => {
              const loc = await Location.getCurrentPositionAsync({});
              mapRef.current?.animateToRegion({
                latitude:       loc.coords.latitude,
                longitude:      loc.coords.longitude,
                latitudeDelta:  0.01,
                longitudeDelta: 0.01,
              }, 1000);
            }}
          >
            <Icons.LocateFixed size={22} color="#555" />
          </TouchableOpacity>
        </View>

        {filteredResults.length > 0 && (
          <View style={styles.resultsList}>
            <FlatList
              data={filteredResults}
              keyExtractor={(item) => `r-${item.sensor_id}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => selectSearchResult(item)}
                >
                  <Text style={styles.resultText}>
                    {item.barangay_name}
                    {'  '}
                    <Text style={{ fontSize: 10, color: '#999' }}>
                      {item.carbon_level ? `(${item.carbon_level})` : ''}
                    </Text>
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={{ flex: 1 }}>
        {
         currentTab === 'Map'        ? renderMapContent()   :
         currentTab === 'Dashboard'  ? <DashboardScreen />  :
         currentTab === 'Reports'    ? <ReportsScreen />    :
         currentTab === 'Prediction' ? <PredictionScreen /> :
                                       <PlacesScreen onNavigateToMap={(item) => {
                                         const lat = parseFloat(item.latitude);
                                         const lng = parseFloat(item.longitude);
                                         setSelectedSensor(item);
                                         setCurrentTab('Map');
                                         if (!isNaN(lat) && !isNaN(lng)) {
                                           setTimeout(() => {
                                             mapRef.current?.animateToRegion({
                                               latitude: lat,
                                               longitude: lng,
                                               latitudeDelta: 0.01,
                                               longitudeDelta: 0.01,
                                             }, 800);
                                           }, 300);
                                         }
                                       }} />}
      </View>

      {/* ── Sensor Info Card ────────────────────────────────────────────── */}
      {currentTab === 'Map' && selectedSensor && (
        <View style={styles.cardOverlay}>
          <View style={[
            styles.infoCard,
            { borderTopColor: getCarbonColor(selectedSensor.carbon_level), borderTopWidth: 4 },
          ]}>
            <Text style={styles.brgyName}>
              Brgy. {selectedSensor.barangay_name || 'Unknown'}
            </Text>
            <Text style={styles.sensorSubtitle}>{selectedSensor.sensor_name}</Text>

            {selectedSensor.carbon_level && (
              <View style={[
                styles.carbonPill,
                { backgroundColor: getCarbonColor(selectedSensor.carbon_level) },
              ]}>
                <Text style={styles.carbonPillText}>{selectedSensor.carbon_level}</Text>
              </View>
            )}

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <SafeIcon name="Wind" color="#3B82F6" size={20} />
                <Text style={styles.statVal}>
                  {selectedSensor.co2_density ?? '—'} ppm
                </Text>
                <Text style={styles.statLbl}>CO₂</Text>
              </View>

              <View style={styles.statBox}>
                <SafeIcon name="Thermometer" color="#EF4444" size={20} />
                <Text style={styles.statVal}>
                  {selectedSensor.temperature_c != null
                    ? `${selectedSensor.temperature_c}°C` : '—'}
                </Text>
                <Text style={styles.statLbl}>Temp</Text>
              </View>

              <View style={styles.statBox}>
                <SafeIcon name="Droplets" color="#06B6D4" size={20} />
                <Text style={styles.statVal}>
                  {selectedSensor.humidity != null
                    ? `${parseFloat(selectedSensor.humidity).toFixed(1)}%` : '—'}
                </Text>
                <Text style={styles.statLbl}>Humidity</Text>
              </View>

              <View style={styles.statBox}>
                <SafeIcon name="Flame" color="#F97316" size={20} />
                <Text style={styles.statVal}>
                  {selectedSensor.heat_index_c != null
                    ? `${selectedSensor.heat_index_c}°C` : '—'}
                </Text>
                <Text style={styles.statLbl}>Heat Idx</Text>
              </View>
            </View>

            {selectedSensor.recorded_at && (
              <Text style={styles.recordedAt}>
                Last update: {new Date(selectedSensor.recorded_at).toLocaleTimeString()}
              </Text>
            )}

            <TouchableOpacity onPress={() => setSelectedSensor(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Bottom Tab Bar ──────────────────────────────────────────────── */}
      <View style={styles.bottomTabBar}>
        {[
          { name: 'Dashboard',  icon: 'LayoutDashboard' },
          { name: 'Map',        icon: 'Map'             },
          { name: 'Reports',    icon: 'ClipboardList'   },
          { name: 'Places',     icon: 'MapPin'          },
          { name: 'Prediction', icon: 'TrendingUp'      },
        ].map(tab => (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => setCurrentTab(tab.name)}
          >
            <SafeIcon
              name={tab.icon}
              size={22}
              color={currentTab === tab.name ? '#FF5C4D' : '#999'}
            />
            <Text style={[
              styles.tabLabel,
              { color: currentTab === tab.name ? '#FF5C4D' : '#999' },
            ]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#FFF' },
  map:             { flex: 1 },

  searchContainer: { position: 'absolute', top: 55, width: '100%', alignItems: 'center', zIndex: 10 },
  searchBar:       { flexDirection: 'row', width: width * 0.9, backgroundColor: 'white', borderRadius: 15, paddingHorizontal: 15, height: 50, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  searchInput:     { flex: 1, marginLeft: 10, fontSize: 15 },
  searchLocateBtn: { padding: 5, borderLeftWidth: 1, borderLeftColor: '#EEE', marginLeft: 5 },
  resultsList:     { width: width * 0.9, backgroundColor: 'white', marginTop: 5, borderRadius: 15, maxHeight: 200, elevation: 5 },
  resultItem:      { padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  resultText:      { fontWeight: '600', fontSize: 14 },

  customMarker:    { backgroundColor: 'white', padding: 2, borderRadius: 20, borderWidth: 3, elevation: 5 },
  markerLogo:      { width: 24, height: 24, borderRadius: 12 },

  cardOverlay:     { position: 'absolute', bottom: 100, width: '100%', alignItems: 'center', zIndex: 50 },
  infoCard:        { width: width * 0.9, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
  brgyName:        { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  sensorSubtitle:  { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  carbonPill:      { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 14 },
  carbonPillText:  { color: 'white', fontWeight: '700', fontSize: 12 },
  statsGrid:       { flexDirection: 'row', justifyContent: 'space-between' },
  statBox:         { flex: 1, alignItems: 'center', padding: 8, backgroundColor: '#F9FAFB', borderRadius: 12, marginHorizontal: 3 },
  statVal:         { fontSize: 13, fontWeight: '700', color: '#1F2937', marginTop: 4 },
  statLbl:         { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  recordedAt:      { fontSize: 10, color: '#D1D5DB', marginTop: 12, textAlign: 'right' },
  closeBtn:        { marginTop: 14, alignSelf: 'center' },
  closeBtnText:    { color: '#6B7280', fontWeight: '600' },

  bottomTabBar:    { flexDirection: 'row', height: 80, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#EEE', paddingBottom: 10, zIndex: 100 },
  tabItem:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel:        { fontSize: 10, marginTop: 4 },
});

export default MapScreen;