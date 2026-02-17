import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Modal, ScrollView, TextInput
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const SENSOR_API      = 'https://bytetech-final1.onrender.com/sensor';
const SENSOR_DATA_API = 'https://bytetech-final1.onrender.com/sensor-data';

// ─── Track previous CO₂ values for trend badges ──────────────────────────────
const previousValues = {};

const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
};

// ─── Carbon level → colour ────────────────────────────────────────────────────
const getCarbonColor = (level) => {
  if (!level) return '#6B7280';
  switch (level.toUpperCase()) {
    case 'VERY HIGH': return '#D64545';
    case 'HIGH':      return '#E8A75D';
    case 'MODERATE':  return '#F59E0B';
    case 'LOW':       return '#3B82F6';
    default:          return '#22C55E'; // NORMAL
  }
};

// ─── Detail Row ───────────────────────────────────────────────────────────────
const DetailRow = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <MaterialCommunityIcons name={icon} size={20} color="#FF5C4D" style={styles.rowIcon} />
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ?? 'N/A'}</Text>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PlacesScreen() {
  const [mergedList, setMergedList]               = useState([]);
  const [filteredResults, setFilteredResults]     = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [refreshing, setRefreshing]               = useState(false);
  const [percentageChanges, setPercentageChanges] = useState({});

  // Modals & filters
  const [selectedItem, setSelectedItem]             = useState(null);
  const [modalVisible, setModalVisible]             = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterName, setFilterName]                 = useState('');
  const [filterLevel, setFilterLevel]               = useState('');
  const [noDataFound, setNoDataFound]               = useState(false);

  // ── Fetch & join ──────────────────────────────────────────────────────────
  const fetchAllData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoading(true);

      const [sensorRes, dataRes] = await Promise.all([
        fetch(SENSOR_API),
        fetch(SENSOR_DATA_API),
      ]);

      // /sensor → plain array
      const sensorList = await sensorRes.json();

      // /sensor-data → { success, total, data: [...] }
      const dataJson = await dataRes.json();
      const dataList = Array.isArray(dataJson) ? dataJson : (dataJson.data || []);

      // Build lookup: sensor_id → reading
      const dataMap = {};
      dataList.forEach(d => { dataMap[d.sensor_id] = d; });

      // Merge
      const merged = (Array.isArray(sensorList) ? sensorList : []).map(s => ({
        ...s,
        ...(dataMap[s.sensor_id] || {}),
      }));

      // Track % changes on co2_density
      const changes = {};
      merged.forEach(item => {
        const key     = `sensor-${item.sensor_id}`;
        const current = parseFloat(item.co2_density) || 0;
        changes[key]  = previousValues[key]
          ? calculatePercentageChange(current, previousValues[key])
          : 0;
        previousValues[key] = current;
      });

      setPercentageChanges(changes);
      setMergedList(merged);
      setFilteredResults(merged);
    } catch (err) {
      console.error('fetchAllData error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData(true);
    const interval = setInterval(() => fetchAllData(false), 1_800_000); // 30 min
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData(false);
  };

  // ── Filter ─────────────────────────────────────────────────────────────────
  const applyFilter = () => {
    const results = mergedList.filter(item => {
      const matchesName = filterName
        ? (item.barangay_name || '').toLowerCase().includes(filterName.toLowerCase()) ||
          (item.sensor_name   || '').toLowerCase().includes(filterName.toLowerCase())
        : true;
      const matchesLevel = filterLevel
        ? (item.carbon_level || '').toLowerCase().includes(filterLevel.toLowerCase())
        : true;
      return matchesName && matchesLevel;
    });

    setFilteredResults(results);
    setFilterModalVisible(false);
    if (results.length === 0) setNoDataFound(true);
  };

  const resetFilter = () => {
    setFilterName('');
    setFilterLevel('');
    setFilteredResults(mergedList);
  };

  // ── Render Item ────────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const co2    = parseFloat(item.co2_density) || 0;
    const temp   = item.temperature_c;
    const key    = `sensor-${item.sensor_id}`;
    const pct    = percentageChanges[key] || 0;
    const isUp   = pct > 0;
    const isFlat = pct === 0;
    const color  = getCarbonColor(item.carbon_level);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => { setSelectedItem(item); setModalVisible(true); }}
        activeOpacity={0.7}
      >
        {/* Left icon */}
        <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
          <MaterialCommunityIcons name="home-group" size={26} color={color} />
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.placeName} numberOfLines={1}>
            {item.barangay_name || item.sensor_name || 'Unknown'}
          </Text>
          <View style={styles.typeRow}>
            {item.carbon_level && (
              <View style={[styles.levelBadge, { backgroundColor: color + '22' }]}>
                <Text style={[styles.levelText, { color }]}>
                  {item.carbon_level}
                </Text>
              </View>
            )}
            <Text style={styles.metaText}>
              {co2} ppm CO₂{temp != null ? ` • ${temp}°C` : ''}
            </Text>
          </View>
        </View>

        {/* Trend */}
        <View style={[
          styles.trendBadge,
          !isFlat && { backgroundColor: isUp ? '#FEF2F2' : '#F0FDF4' },
        ]}>
          <Text style={[
            styles.trendText,
            { color: isFlat ? '#9CA3AF' : isUp ? '#EF4444' : '#22C55E' },
          ]}>
            {isFlat ? '—' : isUp ? '↑' : '↓'}
            {isFlat ? ' 0%' : ` ${Math.abs(pct)}%`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Places</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={20} color="#2D2D2D" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5C4D" />
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(item, idx) => `sensor-${item.sensor_id ?? idx}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5C4D" />
          }
          ListHeaderComponent={() => (
            <View>
              <Text style={styles.subHeaderText}>
                Barangay Sensor Readings • Updates every 30 min
              </Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="map-search-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>No sensors found</Text>
              <Text style={styles.emptySubtext}>Pull down to refresh</Text>
              {(filterName || filterLevel) && (
                <TouchableOpacity onPress={resetFilter} style={styles.clearFilterBtn}>
                  <Text style={styles.clearFilterText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {/* ── Detail Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sensor Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2D2D2D" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <DetailRow
                  label="Sensor Name"
                  value={selectedItem.sensor_name}
                  icon="access-point"
                />
                <DetailRow
                  label="Barangay"
                  value={selectedItem.barangay_name}
                  icon="home-group"
                />
                <DetailRow
                  label="Establishment"
                  value={selectedItem.establishment_name}
                  icon="office-building"
                />
                <DetailRow
                  label="CO₂ Density"
                  value={selectedItem.co2_density != null
                    ? `${selectedItem.co2_density} ppm` : null}
                  icon="molecule-co2"
                />
                <DetailRow
                  label="Carbon Level"
                  value={selectedItem.carbon_level}
                  icon="gauge"
                />
                <DetailRow
                  label="Temperature"
                  value={selectedItem.temperature_c != null
                    ? `${selectedItem.temperature_c}°C` : null}
                  icon="thermometer"
                />
                <DetailRow
                  label="Heat Index"
                  value={selectedItem.heat_index_c != null
                    ? `${selectedItem.heat_index_c}°C` : null}
                  icon="fire"
                />
                <DetailRow
                  label="Humidity"
                  value={selectedItem.humidity != null
                    ? `${parseFloat(selectedItem.humidity).toFixed(1)}%` : null}
                  icon="water-percent"
                />
                <DetailRow
                  label="Latitude"
                  value={selectedItem.latitude}
                  icon="crosshairs-gps"
                />
                <DetailRow
                  label="Longitude"
                  value={selectedItem.longitude}
                  icon="crosshairs-gps"
                />
                <DetailRow
                  label="Installed On"
                  value={selectedItem.installed_on
                    ? new Date(selectedItem.installed_on).toLocaleDateString() : null}
                  icon="calendar"
                />
                <DetailRow
                  label="Last Reading"
                  value={selectedItem.recorded_at
                    ? new Date(selectedItem.recorded_at).toLocaleString() : null}
                  icon="clock-outline"
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Filter Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Places</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2D2D2D" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Barangay / Sensor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Triangulo"
              placeholderTextColor="#9CA3AF"
              value={filterName}
              onChangeText={setFilterName}
            />

            <Text style={styles.inputLabel}>Carbon Level</Text>
            <TextInput
              style={styles.input}
              placeholder="NORMAL, LOW, HIGH, VERY HIGH"
              placeholderTextColor="#9CA3AF"
              value={filterLevel}
              onChangeText={setFilterLevel}
            />

            <TouchableOpacity style={styles.applyButton} onPress={applyFilter}>
              <Text style={styles.applyButtonText}>Apply Filter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => { resetFilter(); setFilterModalVisible(false); }}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── No Data Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={noDataFound}
        transparent
        animationType="fade"
        onRequestClose={() => setNoDataFound(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center', paddingHorizontal: 32 }]}>
          <View style={[styles.modalContent, { borderRadius: 20, alignItems: 'center', padding: 32 }]}>
            <MaterialCommunityIcons name="map-search-outline" size={56} color="#D1D5DB" />
            <Text style={[styles.noDataTitle, { marginTop: 16, textAlign: 'center' }]}>
              No data found
            </Text>
            <Text style={{ color: '#9CA3AF', textAlign: 'center', marginBottom: 24 }}>
              Try adjusting your filters
            </Text>
            <TouchableOpacity style={styles.goBackButton} onPress={() => setNoDataFound(false)}>
              <Text style={styles.goBackText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#F8F9FA' },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle:       { fontSize: 26, fontWeight: '700', color: '#2D2D2D' },
  filterButton:      { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' },

  listPadding:       { paddingHorizontal: 20, paddingBottom: 32 },
  subHeaderText:     { fontSize: 13, color: '#6B7280', marginTop: 20, marginBottom: 4 },
  dateText:          { fontSize: 15, fontWeight: '600', color: '#2D2D2D', marginBottom: 16 },

  card:              { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  iconCircle:        { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  infoContainer:     { flex: 1, marginLeft: 14 },
  placeName:         { fontSize: 15, fontWeight: '600', color: '#2D2D2D' },
  typeRow:           { flexDirection: 'row', alignItems: 'center', marginTop: 5, flexWrap: 'wrap' },
  levelBadge:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  levelText:         { fontSize: 10, fontWeight: '700' },
  metaText:          { fontSize: 12, color: '#6B7280' },
  trendBadge:        { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#F8F9FA', borderRadius: 8 },
  trendText:         { fontWeight: '700', fontSize: 13 },

  emptyContainer:    { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText:         { fontSize: 17, fontWeight: '600', color: '#9CA3AF', marginTop: 16 },
  emptySubtext:      { fontSize: 13, color: '#D1D5DB', marginTop: 6 },
  clearFilterBtn:    { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#FF5C4D' },
  clearFilterText:   { color: '#FF5C4D', fontWeight: '600' },

  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:      { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle:        { fontSize: 20, fontWeight: '700', color: '#2D2D2D' },

  detailRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowIcon:           { marginRight: 16 },
  detailLabel:       { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  detailValue:       { fontSize: 15, color: '#2D2D2D', fontWeight: '600' },

  inputLabel:        { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 8, marginTop: 14 },
  input:             { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#F8F9FA', color: '#2D2D2D' },
  applyButton:       { backgroundColor: '#FF5C4D', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  applyButtonText:   { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  resetButton:       { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  resetButtonText:   { color: '#6B7280', fontWeight: '600', fontSize: 15 },

  noDataTitle:       { fontSize: 18, fontWeight: '600', color: '#2D2D2D' },
  goBackButton:      { paddingHorizontal: 32, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#FF5C4D' },
  goBackText:        { color: '#FF5C4D', fontWeight: '600', fontSize: 15 },
});