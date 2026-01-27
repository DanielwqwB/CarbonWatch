import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, StatusBar, 
  Dimensions, ActivityIndicator 
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Icons from 'lucide-react-native';
import { API_URL } from './config';

// Screen Imports
import DashboardScreen from './dashboard';
import ReportsScreen from './reports';
import EstablishmentScreen from './establishment';

const { width } = Dimensions.get('window');

const NAGA_CITY_CENTER = {
  latitude: 13.6218,
  longitude: 123.1948,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const SafeIcon = ({ name, size = 24, color = "#000" }) => {
  const IconComponent = Icons[name];
  return IconComponent ? <IconComponent size={size} color={color} /> : <View />;
};

const MapScreen = () => {
  const [currentTab, setCurrentTab] = useState('Map');
  const [selectedBrgy, setSelectedBrgy] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBarangayData();
  }, []);

  const fetchBarangayData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/barangay`);
      const data = await response.json();
      const actualData = Array.isArray(data) ? data : (data.data || []);
      setBarangays(actualData);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCarbonColor = (level) => {
    const val = parseFloat(level);
    if (val > 450) return '#D64545'; // High/Danger (Red)
    if (val > 400) return '#E8A75D'; // Moderate (Orange)
    return '#6CAE75'; // Normal (Green)
  };

  const renderContent = () => {
    if (loading && currentTab === 'Map') {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B6E4A" />
        </View>
      );
    }

    switch (currentTab) {
      case 'Dashboard': return <DashboardScreen />;
      case 'Reports': return <ReportsScreen />;
      case 'Establishment': return <EstablishmentScreen />;
      default:
        return (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={NAGA_CITY_CENTER}
          >
            {barangays.map((brgy) => {
              const lat = parseFloat(String(brgy.latitude).replace(',', '.'));
              const lng = parseFloat(String(brgy.longitude).replace(',', '.'));

              if (isNaN(lat) || isNaN(lng)) return null;

              return (
                <Marker 
                  key={String(brgy.barangay_id || brgy._id)}
                  coordinate={{ latitude: lat, longitude: lng }}
                  onPress={() => setSelectedBrgy(brgy)}
                >
                  <View style={[styles.customMarker, { borderColor: getCarbonColor(brgy.carbon_level) }]}>
                     <SafeIcon 
                       name="Wind" 
                       size={18} 
                       color={getCarbonColor(brgy.carbon_level)} 
                     />
                  </View>
                </Marker>
              );
            })}
          </MapView>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={{ flex: 1 }}>{renderContent()}</View>

      {currentTab === 'Map' && selectedBrgy && (
        <View style={styles.cardOverlay}>
          <View style={styles.infoCard}>
            <Text style={styles.brgyName}>Barangay {selectedBrgy.name}</Text>
            
            <View style={styles.statsRow}>
              {/* Temperature Section */}
              <View style={styles.statGroup}>
                <SafeIcon name="Thermometer" color="#E85D5D" size={24} />
                <Text style={styles.statValue}>{String(selectedBrgy.temp || '0').replace('°C', '')}°C</Text>
              </View>

              {/* Carbon Section */}
              <View style={styles.statGroup}>
                <SafeIcon name="Wind" color="#3B6E4A" size={24} />
                <Text style={styles.statValue}>{selectedBrgy.carbon_level || '0'} PPM</Text>
              </View>
            </View>

            <View style={styles.debugBox}>
              <Text style={styles.debugText}>Sensor Status: Active</Text>
              <Text style={styles.debugText}>Last Updated: Just now</Text>
            </View>

            <TouchableOpacity onPress={() => setSelectedBrgy(null)} style={styles.closeBtn}>
              <Text style={{color: '#3B6E4A', fontWeight: 'bold'}}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.bottomTabBar}>
        <TabItem active={currentTab === 'Map'} label="Map" name="Map" onPress={() => setCurrentTab('Map')} />
        <TabItem active={currentTab === 'Dashboard'} label="Dash" name="LayoutDashboard" onPress={() => setCurrentTab('Dashboard')} />
        <TabItem active={currentTab === 'Reports'} label="Reports" name="ClipboardList" onPress={() => setCurrentTab('Reports')} />
        <TabItem active={currentTab === 'Establishment'} label="Establis" name="Building2" onPress={() => setCurrentTab('Establishment')} />
      </View>
    </View>
  );
};

const TabItem = ({ active, label, name, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.tabItem}>
    <SafeIcon name={name} size={22} color={active ? '#3B6E4A' : '#999'} />
    <Text style={[styles.tabLabel, { color: active ? '#3B6E4A' : '#999' }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardOverlay: { position: 'absolute', bottom: 100, width: '100%', alignItems: 'center' },
  infoCard: { width: width * 0.9, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  brgyName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 10 },
  statGroup: { alignItems: 'center', flexDirection: 'row' },
  statValue: { fontSize: 22, fontWeight: 'bold', marginLeft: 8, color: '#222' },
  debugBox: { marginTop: 15, padding: 8, backgroundColor: '#F5F5F5', borderRadius: 10 },
  debugText: { fontSize: 11, color: '#777' },
  bottomTabBar: { flexDirection: 'row', height: 80, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#EEE' },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, marginTop: 4 },
  customMarker: { backgroundColor: 'white', padding: 8, borderRadius: 25, borderWidth: 3, elevation: 5 },
  closeBtn: { marginTop: 15, alignSelf: 'center', padding: 5 }
});

export default MapScreen;