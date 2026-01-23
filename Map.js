import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar, Dimensions, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Icons from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const CENTER_COORD = { latitude: 14.5544, longitude: 121.0463 };

// Safe Icon Helper: Renders a placeholder instead of crashing if an icon is missing
const SafeIcon = ({ name, size = 24, color = "#000", ...props }) => {
  const IconComponent = Icons[name];
  if (!IconComponent) return <View style={{ width: size, height: size, backgroundColor: '#eee' }} />;
  return <IconComponent size={size} color={color} {...props} />;
};

const MapScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          ...CENTER_COORD,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
      >
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

      {/* Overlay UI */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        <View style={styles.topHeaderBar}>
          <View style={styles.weatherWidget}>
            <SafeIcon name="CloudSun" size={24} color="#FDB813" />
            <Text style={styles.weatherText}> 33°C Cloudy</Text>
          </View>
        </View>

        <View style={styles.bottomFloatingPanel}>
          <View style={styles.carbonStatusPanel}>
            <SafeIcon name="Leaf" size={20} color="#6CAE75" fill="#6CAE75" />
            <Text style={styles.carbonStatusText}> Carbon Density: High</Text>
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.bottomTabBar}>
        <View style={styles.tabItem}>
          <SafeIcon name="Map" color="#3B6E4A" fill="#3B6E4A" />
          <Text style={[styles.tabLabel, { color: '#3B6E4A' }]}>Map</Text>
        </View>
        <View style={styles.tabItem}>
          <SafeIcon name="BarChart3" color="#999" />
          <Text style={styles.tabLabel}>Dashboard</Text>
        </View>
      </View>
    </View>
  );
};

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
  topHeaderBar: { paddingHorizontal: 16 },
  weatherWidget: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 10, borderRadius: 25, elevation: 3, alignSelf: 'flex-start' },
  weatherText: { fontSize: 16, fontWeight: '600' },
  bottomFloatingPanel: { paddingHorizontal: 16, marginBottom: 10 },
  carbonStatusPanel: { backgroundColor: 'white', flexDirection: 'row', padding: 12, borderRadius: 25, elevation: 2, alignItems: 'center' },
  carbonStatusText: { fontSize: 15, color: '#555', marginLeft: 8 },
  bottomTabBar: { flexDirection: 'row', backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#EEE', justifyContent: 'space-around', height: 80, paddingVertical: 10 },
  tabItem: { alignItems: 'center' },
  tabLabel: { fontSize: 11, color: '#999', marginTop: 4 }
});

export default MapScreen;