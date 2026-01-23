import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
// Correct imports for Expo Go
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  CloudSun,
  Search,
  Crosshair,
  ChevronLeft,
  Leaf,
  User,
  Map as MapIcon,
  BarChart3,
  ClipboardList,
  Building2,
  AlertTriangle,
  Fingerprint,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Center coordinates for Barangay Centro
const CENTER_COORD = { latitude: 14.5544, longitude: 121.0463 };

// Heatmap data points formatted for react-native-maps
const heatPoints = [
  { latitude: 14.5544, longitude: 121.0463, weight: 1.0 },
  { latitude: 14.555, longitude: 121.047, weight: 0.9 },
  { latitude: 14.556, longitude: 121.045, weight: 0.8 },
  { latitude: 14.553, longitude: 121.048, weight: 0.8 },
  { latitude: 14.552, longitude: 121.042, weight: 0.5 },
  { latitude: 14.549, longitude: 121.049, weight: 0.5 },
  { latitude: 14.550, longitude: 121.044, weight: 0.4 },
  { latitude: 14.558, longitude: 121.038, weight: 0.2 },
  { latitude: 14.551, longitude: 121.052, weight: 0.2 },
];

const MapScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* --- MAP SECTION --- */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          ...CENTER_COORD,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
      >
        {/* 1. Heatmap Layer - Fixed access via MapView.Heatmap */}
        <MapView.Heatmap
          points={heatPoints}
          radius={50}
          opacity={0.7}
          gradient={{
            colors: ['#64dc64', '#ffdc00', '#f03232'],
            startPoints: [0.1, 0.4, 1.0],
            colorMapSize: 256,
          }}
        />

        {/* 2. Custom Marker */}
        <Marker coordinate={CENTER_COORD}>
          <View style={styles.calloutContainer}>
            <View style={styles.calloutBubble}>
              <Text style={styles.calloutTitle}>Barangay Centro</Text>
              
              <View style={styles.calloutTempRow}>
                <AlertTriangle size={32} color="#FF6B6B" fill="#FF6B6B" style={{marginRight: 8}} />
                <Text style={styles.calloutTempText}>39.2°C</Text>
                 <View style={styles.fingerprintIcon}>
                  <Fingerprint size={24} color="#E58E6D" opacity={0.7} />
                 </View>
              </View>

              <View style={styles.calloutDataRow}>
                <Leaf size={16} color="#6CAE75" fill="#6CAE75" style={{marginRight: 6}} />
                <Text style={styles.calloutDataText}>Carbon Density: </Text>
                <Text style={[styles.calloutDataText, styles.redText]}>High</Text>
              </View>
            </View>
            <View style={styles.calloutArrow} />
            <View style={styles.markerBase}>
                <AlertTriangle size={40} color="#D64545" fill="#E85D5D" />
                <View style={styles.markerBaseShadow} />
            </View>
          </View>
        </Marker>
      </MapView>

      {/* --- OVERLAY UI --- */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        <View style={styles.topHeaderBar}>
          <View style={styles.weatherWidget}>
            <CloudSun size={24} color="#FDB813" style={{ marginRight: 8 }} />
            <Text style={styles.weatherText}>33°C Cloudy</Text>
          </View>

          <View style={styles.topIconsContainer}>
            <TouchableOpacity style={styles.iconButton}>
              <Search size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, styles.locateButton]}>
              <Crosshair size={24} color="#555" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomFloatingPanel}>
          <TouchableOpacity style={styles.heatAirButton}>
            <Text style={styles.heatAirButtonText}>Heat and Air Quality</Text>
            <ChevronLeft size={20} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>

          <View style={styles.carbonStatusPanel}>
            <View style={styles.carbonStatusLeft}>
              <Leaf size={20} color="#6CAE75" fill="#6CAE75" style={{ marginRight: 8 }} />
              <Text style={styles.carbonStatusText}>Carbon Density</Text>
            </View>
            <View style={styles.carbonStatusRight}>
              <User size={20} color="#5F9EA0" fill="#A0CED9" style={{ marginRight: 6 }}/>
              <Text style={[styles.carbonStatusText, { fontWeight: 'bold', color: '#333' }]}>High</Text>
            </View>
          </View>
        </View>
      </View>

      {/* --- BOTTOM TAB BAR --- */}
      <View style={styles.bottomTabBar}>
        <TabItem icon={<MapIcon size={24} color="#3B6E4A" fill="#3B6E4A" />} label="Map" active />
        <TabItem icon={<BarChart3 size={24} color="#999" />} label="Dashboard" />
        <TabItem icon={<ClipboardList size={24} color="#999" />} label="Reports" />
        <TabItem icon={<Building2 size={24} color="#999" />} label="Establish..." />
      </View>
    </View>
  );
};

const TabItem = ({ icon, label, active }) => (
  <TouchableOpacity style={styles.tabItem}>
    {icon}
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    {active && <View style={styles.activeTabIndicator} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F7' },
  map: { flex: 1 },
  calloutContainer: { alignItems: 'center', justifyContent: 'flex-end', marginBottom: 5 },
  calloutBubble: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: 200,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  calloutTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  calloutTempRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  calloutTempText: { fontSize: 32, fontWeight: 'bold', color: '#333', marginRight: 12 },
  fingerprintIcon: { backgroundColor: '#F8E8E0', padding: 4, borderRadius: 8 },
  calloutDataRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  calloutDataText: { fontSize: 14, color: '#666' },
  redText: { color: '#D64545', fontWeight: 'bold', marginLeft: 4 },
  calloutArrow: {
    width: 0, height: 0,
    borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 12,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'white',
    marginTop: -1, zIndex: 11,
  },
  markerBase: { alignItems: 'center', marginTop: 4 },
  markerBaseShadow: { width: 20, height: 6, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 10, marginTop: -4 },
  overlayContainer: { 
    position: 'absolute', 
    top: 0, left: 0, right: 0, bottom: 80, 
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30 
  },
  topHeaderBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  weatherWidget: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 25, elevation: 3 },
  weatherText: { fontSize: 16, fontWeight: '600', color: '#333' },
  topIconsContainer: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { padding: 8, marginLeft: 8 },
  locateButton: { backgroundColor: 'white', borderRadius: 12, padding: 10, elevation: 3 },
  bottomFloatingPanel: { paddingHorizontal: 16, marginBottom: 10 },
  heatAirButton: { backgroundColor: '#4F835E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 25, marginBottom: 10 },
  heatAirButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  carbonStatusPanel: { backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, elevation: 2, borderWidth: 1, borderColor: '#E0E0E0' },
  carbonStatusLeft: { flexDirection: 'row', alignItems: 'center' },
  carbonStatusRight: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F8FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  carbonStatusText: { fontSize: 15, color: '#555' },
  bottomTabBar: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12, borderTopWidth: 1, borderTopColor: '#EEEEEE', justifyContent: 'space-around', height: 80 },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  tabLabelActive: { color: '#3B6E4A', fontWeight: 'bold' },
  activeTabIndicator: { height: 3, width: 40, backgroundColor: '#3B6E4A', position: 'absolute', top: -12, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }
});

export default MapScreen;