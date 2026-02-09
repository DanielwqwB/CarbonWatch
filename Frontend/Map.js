import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, StatusBar, 
  Dimensions, ActivityIndicator, Image, TextInput, FlatList 
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Icons from 'lucide-react-native';
import { API_URL } from './config';

// Screen Imports
import DashboardScreen from './dashboard';
import ReportsScreen from './reports';
import PredictionScreen from './prediction';
import PlacesScreen from './places';

const { width } = Dimensions.get('window');
const LOGO_IMG = require('./assets/image.png'); 

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
  const mapRef = useRef(null);
  const [currentTab, setCurrentTab] = useState('Map');
  const [selectedBrgy, setSelectedBrgy] = useState(null);
  const [selectedEst, setSelectedEst] = useState(null);
  const [barangay, setBarangay] = useState([]);
  const [establishments, setEstablishments] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);

  useEffect(() => {
    fetchAllData();
    setupLocation();
  }, []);

  const setupLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10 }, () => {});
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [brgyRes, estRes] = await Promise.all([
        fetch(`https://bytetech-final1.onrender.com/barangay`),
        fetch(`https://bytetech-final1.onrender.com/establishment`)
      ]);
      const brgyData = await brgyRes.json();
      const estData = await estRes.json();
      setBarangay(Array.isArray(brgyData) ? brgyData : (brgyData.data || []));
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

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length > 0) {
      const combined = [
        ...barangay.map(b => ({ ...b, type: 'Barangay', displayName: b.barangay_name })),
        ...establishments.map(e => ({ ...e, type: 'Establishment', displayName: e.establishment_name }))
      ];
      const filtered = combined.filter(item => item.displayName.toLowerCase().includes(text.toLowerCase()));
      setFilteredResults(filtered);
    } else { setFilteredResults([]); }
  };

  const selectSearchResult = (item) => {
    const region = { latitude: parseFloat(item.latitude), longitude: parseFloat(item.longitude), latitudeDelta: 0.01, longitudeDelta: 0.01 };
    mapRef.current.animateToRegion(region, 1000);
    setSearchQuery('');
    setFilteredResults([]);
    if (item.type === 'Barangay') { setSelectedEst(null); setSelectedBrgy(item); }
    else { setSelectedBrgy(null); setSelectedEst(item); }
  };

  const renderMapContent = () => (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={NAGA_CITY_CENTER}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onPress={() => { setSelectedBrgy(null); setSelectedEst(null); setFilteredResults([]); }}
      >
        {barangay.map((brgy, i) => (
          <Marker key={`b-${i}`} coordinate={{ latitude: parseFloat(brgy.latitude), longitude: parseFloat(brgy.longitude) }} onPress={() => { setSelectedEst(null); setSelectedBrgy(brgy); }}>
            <View style={[styles.customMarker, { borderColor: getMarkerColor(brgy.temperature_c) }]}>
              <Image source={LOGO_IMG} style={styles.markerLogo} />
            </View>
          </Marker>
        ))}
        {establishments.map((est, i) => (
          <Marker key={`e-${i}`} coordinate={{ latitude: parseFloat(est.latitude), longitude: parseFloat(est.longitude) }} onPress={() => { setSelectedBrgy(null); setSelectedEst(est); }}>
            <View style={styles.establishmentMarker}>
              <Image source={LOGO_IMG} style={styles.markerLogoSmall} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* SEARCH CONTAINER - Only one Locate button exists here now */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icons.Search size={20} color="#999" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search Naga City..." 
            value={searchQuery} 
            onChangeText={handleSearch} 
          />
          <TouchableOpacity 
            style={styles.searchLocateBtn} 
            onPress={async () => {
              let loc = await Location.getCurrentPositionAsync({});
              mapRef.current.animateToRegion({ 
                latitude: loc.coords.latitude, 
                longitude: loc.coords.longitude, 
                latitudeDelta: 0.01, 
                longitudeDelta: 0.01 
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
              keyExtractor={(item, index) => index.toString()} 
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => selectSearchResult(item)}>
                  <Text style={styles.resultText}>{item.displayName} <Text style={{fontSize: 10, color: '#999'}}>({item.type})</Text></Text>
                </TouchableOpacity>
            )} />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      <View style={{ flex: 1 }}>
        {currentTab === 'Map' ? renderMapContent() : 
         currentTab === 'Dashboard' ? <DashboardScreen /> : 
         currentTab === 'Reports' ? <ReportsScreen /> : 
         currentTab === 'Prediction' ? <PredictionScreen /> : <PlacesScreen />}
      </View>

      {/* DATA INFO CARDS */}
      {currentTab === 'Map' && selectedBrgy && (
        <View style={styles.cardOverlay}>
          <View style={styles.infoCard}>
            <Text style={styles.brgyName}>Brgy. {selectedBrgy.barangay_name}</Text>
            <Text style={styles.cityName}>{selectedBrgy.city || 'Naga City'}</Text>
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

      {currentTab === 'Map' && selectedEst && (
        <View style={styles.cardOverlay}>
          <View style={[styles.infoCard, { borderLeftWidth: 5, borderLeftColor: '#5B9A8B' }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={styles.brgyName}>{selectedEst.establishment_name}</Text>
                <View style={styles.typeBadge}><Text style={styles.typeText}>{selectedEst.establishment_type}</Text></View>
            </View>
            <View style={[styles.statsRow, {marginTop: 15}]}>
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

      {/* BOTTOM TAB BAR */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('Map')}>
          <Icons.Map size={22} color={currentTab === 'Map' ? '#ff5c4d' : '#999'} />
          <Text style={[styles.tabLabel, { color: currentTab === 'Map' ? '#FF5C4D' : '#999' }]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('Dashboard')}>
          <Icons.LayoutDashboard size={22} color={currentTab === 'Dashboard' ? '#FF5C4D' : '#999'} />
          <Text style={[styles.tabLabel, { color: currentTab === 'Dashboard' ? '#FF5C4D' : '#999' }]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('Reports')}>
          <Icons.ClipboardList size={22} color={currentTab === 'Reports' ? '#FF5C4D' : '#999'} />
          <Text style={[styles.tabLabel, { color: currentTab === 'Reports' ? '#FF5C4D' : '#999' }]}>Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('Prediction')}>
          <Icons.TrendingUp size={22} color={currentTab === 'Prediction' ? '#FF5C4D' : '#999'} />
          <Text style={[styles.tabLabel, { color: currentTab === 'Prediction' ? '#FF5C4D' : '#999' }]}>Prediction</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setCurrentTab('Places')}>
          <Icons.MapPin size={22} color={currentTab === 'Places' ? '#FF5C4D' : '#999'} />
          <Text style={[styles.tabLabel, { color: currentTab === 'Places' ? '#FF5C4D' : '#999' }]}>Places</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  map: { flex: 1 },
  searchContainer: { position: 'absolute', top: 55, width: '100%', alignItems: 'center', zIndex: 10 },
  searchBar: { 
    flexDirection: 'row', 
    width: width * 0.9, 
    backgroundColor: 'white', 
    borderRadius: 15, 
    paddingHorizontal: 15, 
    height: 50, 
    alignItems: 'center', 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  searchLocateBtn: { 
    padding: 5, 
    borderLeftWidth: 1, 
    borderLeftColor: '#EEE', 
    marginLeft: 5 
  },
  resultsList: { width: width * 0.9, backgroundColor: 'white', marginTop: 5, borderRadius: 15, maxHeight: 200, elevation: 5 },
  resultItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  resultText: { fontWeight: '600' },
  bottomTabBar: { flexDirection: 'row', height: 80, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#EEE', paddingBottom: 10, zIndex: 100 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, marginTop: 4 },
  customMarker: { backgroundColor: 'white', padding: 2, borderRadius: 20, borderWidth: 3, elevation: 5 },
  establishmentMarker: { backgroundColor: 'white', padding: 4, borderRadius: 25, borderWidth: 2, borderColor: '#5B9A8B', elevation: 5 },
  markerLogo: { width: 24, height: 24, borderRadius: 12 },
  markerLogoSmall: { width: 20, height: 20, borderRadius: 10 },
  cardOverlay: { position: 'absolute', bottom: 100, width: '100%', alignItems: 'center', zIndex: 50 },
  infoCard: { width: width * 0.9, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 10 },
  brgyName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  cityName: { fontSize: 12, color: '#999' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  statGroup: { alignItems: 'center', flexDirection: 'row' },
  statValue: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  unitText: { fontSize: 9, color: '#999', marginLeft: 4 },
  typeBadge: { backgroundColor: '#E8F3F1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontSize: 10, color: '#5B9A8B', fontWeight: 'bold' },
  closeBtn: { marginTop: 15, alignSelf: 'center' },
  closeBtnText: { color: '#3B6E4A', fontWeight: 'bold' }
});

export default MapScreen;