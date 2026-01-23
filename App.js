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
// Standard imports for Expo Go
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Icons from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const CENTER_COORD = { latitude: 14.5544, longitude: 121.0463 };

const heatPoints = [
  { latitude: 14.5544, longitude: 121.0463, weight: 1.0 },
  { latitude: 14.555, longitude: 121.047, weight: 0.9 },
  { latitude: 14.552, longitude: 121.042, weight: 0.5 },
];

const MapScreen = () => {
  // Safe Icon Helper to prevent 'undefined' errors
  const SafeIcon = ({ name, size = 24, color = "#000", ...props }) => {
    const IconComponent = Icons[name];
    if (!IconComponent) return <View style={{ width: size, height: size, backgroundColor: '#ccc' }} />;
    return <IconComponent size={size} color={color} {...props} />;
  };

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
        {/* Heatmap check */}
        {MapView.Heatmap ? (
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
        ) : null}

        <Marker coordinate={CENTER_COORD}>
          <View style={styles.calloutContainer}>
            <View style={styles.calloutBubble}>
              <Text style={styles.calloutTitle}>Barangay Centro</Text>
              <View style={styles.calloutTempRow}>
                <SafeIcon name="AlertTriangle" size={32} color="#FF6B6B" fill="#FF6B6B" />
                <Text style={styles.calloutTempText}>39.2°C</Text>
                <View style={styles.fingerprintIcon}>
                  <SafeIcon name="Fingerprint" size={24} color="#E58E6D" opacity={0.7} />
                </View>
              </View>
              <View style={styles.calloutDataRow}>
                <SafeIcon name="Leaf" size={16} color="#6CAE75" fill="#6CAE75" />
                <Text style={styles.calloutDataText}> Carbon Density: </Text>
                <Text style={[styles.calloutDataText, styles.redText]}>High</Text>
              </View>
            </View>
            <View style={styles.calloutArrow} />
            <View style={styles.markerBase}>
                <SafeIcon name="AlertTriangle" size={40} color="#D64545" fill="#E85D5D" />
            </View>
          </View>
        </Marker>
      </MapView>

      {/* --- OVERLAY UI --- */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        <View style={styles.topHeaderBar}>
          <View style={styles.weatherWidget}>
            <SafeIcon name="CloudSun" size={24} color="#FDB813" />
            <Text style={styles.weatherText}> 33°C Cloudy</Text>
          </View>
          <View style={styles.topIconsContainer}>
            <TouchableOpacity style={styles.iconButton}><SafeIcon name="Search" color="#666" /></TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, styles.locateButton]}><SafeIcon name="Crosshair" color="#555" /></TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomFloatingPanel}>
          <TouchableOpacity style={styles.heatAirButton}>
            <Text style={styles.heatAirButtonText}>Heat and Air Quality</Text>
            <SafeIcon name="ChevronRight" size={20} color="white" />
          </TouchableOpacity>
          <View style={styles.carbonStatusPanel}>
            <View style={styles.carbonStatusLeft}>
              <SafeIcon name="Leaf" size={20} color="#6CAE75" fill="#6CAE75" />
              <Text style={styles.carbonStatusText}> Carbon Density</Text>
            </View>
            <View style={styles.carbonStatusRight}>
              <SafeIcon name="User" size={20} color="#5F9EA0" fill="#A0CED9" />
              <Text style={[styles.carbonStatusText, { fontWeight: 'bold' }]}> High</Text>
            </View>
          </View>
        </View>
      </View>

      {/* --- BOTTOM TAB BAR --- */}
      <View style={styles.bottomTabBar}>
        <TabItem icon={<SafeIcon name="Map" color="#3B6E4A" fill="#3B6E4A" />} label="Map" active />
        <TabItem icon={<SafeIcon name="BarChart3" color="#999" />} label="Dashboard" />
        <TabItem icon={<SafeIcon name="ClipboardList" color="#999" />} label="Reports" />
        <TabItem icon={<SafeIcon name="Building2" color="#999" />} label="Establish..." />
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
  calloutBubble: { backgroundColor: 'white', borderRadius: 16, padding: 12, alignItems: 'center', width: 200, elevation: 5 },
  calloutTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  calloutTempRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  calloutTempText: { fontSize: 32, fontWeight: 'bold', color: '#333', marginHorizontal: 8 },
  fingerprintIcon: { backgroundColor: '#F8E8E0', padding: 4, borderRadius: 8 },
  calloutDataRow: { flexDirection: 'row', alignItems: 'center' },
  calloutDataText: { fontSize: 14, color: '#666' },
  redText: { color: '#D64545', fontWeight: 'bold' },
  calloutArrow: { width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'white' },
  markerBase: { alignItems: 'center' },
  overlayContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 80, justifyContent: 'space-between', paddingTop: 40 },
  topHeaderBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  weatherWidget: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 10, borderRadius: 25, elevation: 3 },
  weatherText: { fontSize: 16, fontWeight: '600' },
  topIconsContainer: { flexDirection: 'row' },
  iconButton: { padding: 8 },
  locateButton: { backgroundColor: 'white', borderRadius: 12, elevation: 3 },
  bottomFloatingPanel: { paddingHorizontal: 16, marginBottom: 10 },
  heatAirButton: { backgroundColor: '#4F835E', flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 25, marginBottom: 10 },
  heatAirButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  carbonStatusPanel: { backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 25, elevation: 2 },
  carbonStatusLeft: { flexDirection: 'row', alignItems: 'center' },
  carbonStatusRight: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F8FF', padding: 6, borderRadius: 16 },
  carbonStatusText: { fontSize: 15, color: '#555' },
  bottomTabBar: { flexDirection: 'row', backgroundColor: 'white', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EEE', justifyContent: 'space-around', height: 80 },
  tabItem: { alignItems: 'center' },
  tabLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  tabLabelActive: { color: '#3B6E4A', fontWeight: 'bold' },
  activeTabIndicator: { height: 3, width: 40, backgroundColor: '#3B6E4A', position: 'absolute', top: -12 }
});

export default MapScreen;