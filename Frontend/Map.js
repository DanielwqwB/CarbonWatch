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

const TabItem = ({ active, label, name, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.tabItem}>
    <SafeIcon name={name} size={22} color={active ? '#3B6E4A' : '#999'} />
    <Text style={[styles.tabLabel, { color: active ? '#3B6E4A' : '#999' }]}>{label}</Text>
  </TouchableOpacity>
);

const MapScreen = () => {
  const [currentTab, setCurrentTab] = useState('Map');
  const [selectedBrgy, setSelectedBrgy] = useState(null);
  const [selectedEst, setSelectedEst] = useState(null); // State for clicked establishment
  const [barangays, setBarangays] = useState([]);
  const [establishments, setEstablishments] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [brgyRes, estRes] = await Promise.all([
        fetch(`${API_URL}/barangay`),
        fetch(`https://bytetech.onrender.com/api/establishments`)
      ]);

      const brgyData = await brgyRes.json();
      const estData = await estRes.json();
      
      setBarangays(Array.isArray(brgyData) ? brgyData : (brgyData.data || []));
      setEstablishments(Array.isArray(estData) ? estData : (estData.data || []));
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (tempStr) => {
    if (!tempStr) return '#6CAE75'; 
    const temp = parseFloat(String(tempStr).replace('°C', ''));
    if (temp >= 35) return '#D64545'; 
    if (temp >= 32) return '#E8A75D'; 
    return '#6CAE75'; 
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
            onPress={() => { setSelectedBrgy(null); setSelectedEst(null); }} // Clear on map tap
          >
            {/* BARANGAY MARKERS */}
            {barangays.map((brgy, index) => (
              <Marker 
                key={`brgy-${index}`}
                coordinate={{ latitude: parseFloat(brgy.latitude), longitude: parseFloat(brgy.longitude) }}
                onPress={() => { setSelectedEst(null); setSelectedBrgy(brgy); }}
              >
                <View style={[styles.customMarker, { borderColor: getMarkerColor(brgy.temperature_c) }]}>
                   <SafeIcon name="Thermometer" size={18} color={getMarkerColor(brgy.temperature_c)} />
                </View>
              </Marker>
            ))}

            {/* ESTABLISHMENT MARKERS */}
            {establishments.map((est, index) => (
              <Marker
                key={`est-${index}`}
                coordinate={{ latitude: parseFloat(est.latitude), longitude: parseFloat(est.longitude) }}
                onPress={() => { setSelectedBrgy(null); setSelectedEst(est); }}
              >
                <View style={styles.establishmentMarker}>
                  <SafeIcon name="Store" size={16} color="#FFF" />
                </View>
              </Marker>
            ))}
          </MapView>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={{ flex: 1 }}>{renderContent()}</View>

      {/* BARANGAY INFO CARD */}
      {currentTab === 'Map' && selectedBrgy && (
        <View style={styles.cardOverlay}>
          <View style={styles.infoCard}>
            <Text style={styles.brgyName}>Brgy. {selectedBrgy.name}</Text>
            <Text style={styles.cityName}>{selectedBrgy.city}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statGroup}>
                <SafeIcon name="Thermometer" color="#E85D5D" size={24} />
                <Text style={styles.statValue}>{selectedBrgy.temperature_c}</Text>
              </View>
              <View style={styles.statGroup}>
                <SafeIcon name="Users" color="#3B82F6" size={24} />
                <View><Text style={styles.statValue}>{selectedBrgy.density}</Text><Text style={styles.unitText}>Density</Text></View>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectedBrgy(null)} style={styles.closeBtn}><Text style={styles.closeBtnText}>Dismiss</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* ESTABLISHMENT INFO CARD */}
      {currentTab === 'Map' && selectedEst && (
        <View style={styles.cardOverlay}>
          <View style={[styles.infoCard, { borderLeftWidth: 5, borderLeftColor: '#5B9A8B' }]}>
            <View style={styles.estHeader}>
                <Text style={styles.brgyName}>{selectedEst.establishment_name}</Text>
                <View style={styles.typeBadge}><Text style={styles.typeText}>{selectedEst.establishment_type}</Text></View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statGroup}>
                <SafeIcon name="Leaf" color="#5B9A8B" size={24} />
                <View><Text style={styles.statValue}>{selectedEst.density}</Text><Text style={styles.unitText}>Tons (CO₂e)</Text></View>
              </View>
              <View style={styles.statGroup}>
                <SafeIcon name="Thermometer" color="#E8A75D" size={24} />
                <Text style={styles.statValue}>{selectedEst.temperature_c}°C</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectedEst(null)} style={styles.closeBtn}><Text style={[styles.closeBtnText, {color: '#5B9A8B'}]}>Dismiss</Text></TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.bottomTabBar}>
        <TabItem active={currentTab === 'Map'} label="Map" name="Map" onPress={() => setCurrentTab('Map')} />
        <TabItem active={currentTab === 'Dashboard'} label="Dashboard" name="LayoutDashboard" onPress={() => setCurrentTab('Dashboard')} />
        <TabItem active={currentTab === 'Reports'} label="Reports" name="ClipboardList" onPress={() => setCurrentTab('Reports')} />
        <TabItem active={currentTab === 'Establishment'} label="Establishmentx" name="Building2" onPress={() => setCurrentTab('Establishment')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardOverlay: { position: 'absolute', bottom: 100, width: '100%', alignItems: 'center' },
  infoCard: { width: width * 0.9, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  brgyName: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  cityName: { fontSize: 13, color: '#999', marginBottom: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  statGroup: { alignItems: 'center', flexDirection: 'row' },
  statValue: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  unitText: { fontSize: 10, color: '#999', marginLeft: 8 },
  bottomTabBar: { flexDirection: 'row', height: 80, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#EEE', paddingBottom: 10 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, marginTop: 4 },
  customMarker: { backgroundColor: 'white', padding: 6, borderRadius: 20, borderWidth: 3, elevation: 5 },
  establishmentMarker: { backgroundColor: '#5B9A8B', padding: 8, borderRadius: 25, borderWidth: 2, borderColor: '#FFF', elevation: 8 },
  closeBtn: { marginTop: 15, alignSelf: 'center', padding: 10 },
  closeBtnText: { color: '#3B6E4A', fontWeight: 'bold' },
  estHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { backgroundColor: '#E8F3F1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  typeText: { fontSize: 10, color: '#5B9A8B', fontWeight: 'bold' }
});

export default MapScreen;