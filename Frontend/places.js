import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Modal, ScrollView, TextInput, Animated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const SENSOR_API      = 'https://bytetech-final1.onrender.com/sensor';
const SENSOR_DATA_API = 'https://bytetech-final1.onrender.com/sensor-data';

/** How often (in ms) to auto-refresh */
const REFRESH_INTERVAL_MS = 30_000; // 30 seconds

// ─── Track previo us CO₂ values for trend badges ─────────────────────────────
const previousValues = {};

const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
};

// ─── Carbon level → colour with gradient support ────────────────────────────
const getCarbonColor = (level) => {
  if (!level) return { primary: '#6B7280', secondary: '#9CA3AF' };
  switch (level.toUpperCase()) {
    case 'VERY HIGH': return { primary: '#DC2626', secondary: '#EF4444' };
    case 'HIGH':      return { primary: '#EA580C', secondary: '#F97316' };
    case 'MODERATE':  return { primary: '#D97706', secondary: '#F59E0B' };
    case 'LOW':       return { primary: '#2563EB', secondary: '#3B82F6' };
    default:          return { primary: '#16A34A', secondary: '#22C55E' }; // NORMAL
  }
};

// ─── Live Pulse Indicator ────────────────────────────────────────────────────
const LivePulse = ({ countdown }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(   
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.liveContainer}>
      <View style={styles.pulseWrapper}>
        <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
        <View style={styles.pulseDot} />
      </View>
      <Text style={styles.liveText}>LIVE</Text>
      <Text style={styles.countdownText}>  {countdown}s</Text>
    </View>
  );
};

// ─── Enhanced Detail Row ─────────────────────────────────────────────────────
const DetailRow = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconContainer}>
      <Ionicons name={icon} size={18} color="#FF5C4D" />
    </View>
    <View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ?? 'N/A'}</Text>
    </View>
  </View>
);

// ─── Animated Card Component ─────────────────────────────────────────────────
const AnimatedCard = ({ item, onPress, percentageChanges }) => {
  const scaleAnim = useState(new Animated.Value(1))[0];

  const handlePressIn  = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();

  const co2    = parseFloat(item.co2_density) || 0;
  const temp   = item.temperature_c;
  const key    = `sensor-${item.sensor_id}`;
  const pct    = percentageChanges[key] || 0;
  const isUp   = pct > 0;
  const isFlat = pct === 0;
  const colors = getCarbonColor(item.carbon_level);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Gradient accent on left edge */}
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.cardAccent}
        />

        {/* Icon with gradient background */}
        <View style={styles.iconCircle}>
          <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.iconGradient}>
            <MaterialCommunityIcons name="weather-windy" size={22} color="#FFF" />
          </LinearGradient>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.placeName} numberOfLines={1}>
            {item.sensor_name || 'Unknown'}
          </Text>

          {item.carbon_level && (
            <View style={styles.typeRow}>
              <View style={[styles.levelBadge, { backgroundColor: colors.primary + '18' }]}>
                <View style={[styles.levelDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.levelText, { color: colors.primary }]}>
                  {item.carbon_level}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="molecule-co2" size={13} color="#6B7280" />
              <Text style={styles.metaText}>{co2} ppm</Text>
            </View>
            {temp != null && (
              <View style={styles.metricItem}>
                <Ionicons name="thermometer-outline" size={13} color="#6B7280" />
                <Text style={styles.metaText}>{temp}°C</Text>
              </View>
            )}
          </View>
        </View>

        {/* Enhanced Trend Badge */}
        <View style={styles.trendContainer}>
          <View style={[styles.trendBadge, {
            backgroundColor: isFlat ? '#F3F4F6' : isUp ? '#FEF2F1' : '#F0FDF4',
          }]}>
            <Ionicons
              name={isFlat ? 'remove' : isUp ? 'trending-up' : 'trending-down'}
              size={14}
              color={isFlat ? '#9CA3AF' : isUp ? '#DC2626' : '#16A34A'}
            />
            <Text style={[styles.trendText, {
              color: isFlat ? '#9CA3AF' : isUp ? '#DC2626' : '#16A34A',
            }]}>
              {Math.abs(pct)}%
            </Text>
          </View>
          <Text style={styles.trendLabel}>vs. last</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function PlacesScreen() {
  const [mergedList,        setMergedList]        = useState([]);
  const [filteredResults,   setFilteredResults]   = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);
  const [percentageChanges, setPercentageChanges] = useState({});
  const [lastUpdated,       setLastUpdated]       = useState(null);
  const [countdown,         setCountdown]         = useState(REFRESH_INTERVAL_MS / 1000);

  // Modals & filters
  const [selectedItem,       setSelectedItem]       = useState(null);
  const [modalVisible,       setModalVisible]       = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterName,         setFilterName]         = useState('');
  const [filterLevel,        setFilterLevel]        = useState('');
  const [noDataFound,        setNoDataFound]        = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────
  const intervalRef  = useRef(null);
  const countdownRef = useRef(null);

  // ── Fetch & join ─────────────────────────────────────────────────────────
  const fetchAllData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoading(true);

      const [sensorRes, dataRes] = await Promise.all([
        fetch(SENSOR_API),
        fetch(SENSOR_DATA_API),
      ]);

      const sensorList = await sensorRes.json();
      const dataJson   = await dataRes.json();
      const dataList   = Array.isArray(dataJson) ? dataJson : (dataJson.data || []);

      const dataMap = {};
      dataList.forEach(d => { dataMap[d.sensor_id] = d; });

      const merged = (Array.isArray(sensorList) ? sensorList : []).map(s => ({
        ...s,
        ...(dataMap[s.sensor_id] || {}),
      }));

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
      setFilteredResults(prev => {
        // Re-apply active filters on new data
        if (!filterName && !filterLevel) return merged;
        return merged.filter(item => {
          const matchesName  = filterName
            ? (item.barangay_name || '').toLowerCase().includes(filterName.toLowerCase()) ||
              (item.sensor_name   || '').toLowerCase().includes(filterName.toLowerCase())
            : true;
          const matchesLevel = filterLevel
            ? (item.carbon_level || '').toLowerCase().includes(filterLevel.toLowerCase())
            : true;
          return matchesName && matchesLevel;
        });
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error('fetchAllData error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Start / restart the auto-refresh cycle ───────────────────────────────
  const startRealtimeCycle = () => {
    // Clear any existing timers
    if (intervalRef.current)  clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Reset countdown
    setCountdown(REFRESH_INTERVAL_MS / 1000);

    // Countdown ticker (every second)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL_MS / 1000 : prev - 1));
    }, 1000);

    // Data fetch interval
    intervalRef.current = setInterval(() => {
      fetchAllData(false);
      setCountdown(REFRESH_INTERVAL_MS / 1000); // reset visual countdown
    }, REFRESH_INTERVAL_MS);
  };

  useEffect(() => {
    fetchAllData(true);
    startRealtimeCycle();
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData(false);
    startRealtimeCycle(); // restart countdown after manual refresh
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const applyFilter = () => {
    const results = mergedList.filter(item => {
      const matchesName  = filterName
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

  const hasActiveFilters = filterName || filterLevel;

  // ── Render Item ───────────────────────────────────────────────────────────
  const renderItem = ({ item }) => (
    <AnimatedCard
      item={item}
      onPress={() => { setSelectedItem(item); setModalVisible(true); }}
      percentageChanges={percentageChanges}
    />
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* Enhanced Header with gradient */}
      <LinearGradient colors={['#FFFFFF', '#F8F9FA']} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Places</Text>
            <Text style={styles.headerSubtitle}>Real-time sensor monitoring</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Live Indicator */}
            {!loading && <LivePulse countdown={countdown} />}
            {/* Filter Button */}
            <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
              <Ionicons name="options-outline" size={22} color="#2D2D2D" />
              {hasActiveFilters && <View style={styles.filterIndicator} />}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5C4D" />
          <Text style={styles.loadingText}>Loading sensor data…</Text>
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
            <View style={styles.listHeader}>
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <Ionicons name="radio-outline" size={16} color="#FF5C4D" />
                  <Text style={styles.statValue}>{filteredResults.length}</Text>
                  <Text style={styles.statLabel}>Active Sensors</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={[styles.statItem, { flex: 2 }]}>
                  <Text style={styles.dateText}>
                    {lastUpdated
                      ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                      : 'Fetching…'}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="cloud-offline-outline" size={48} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyText}>No sensors found</Text>
              <Text style={styles.emptySubtext}>
                {hasActiveFilters ? 'Try adjusting your filters' : 'Pull down to refresh'}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity style={styles.clearFilterBtn} onPress={resetFilter}>
                  <Text style={styles.clearFilterText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {/* ── Enhanced Detail Modal ──────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderContainer}>
              <LinearGradient
                colors={selectedItem ? [getCarbonColor(selectedItem.carbon_level).primary, getCarbonColor(selectedItem.carbon_level).secondary] : ['#FF5C4D', '#FF8A7A']}
                style={styles.modalHeaderGradient}
              >
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Sensor Details</Text>
                    <Text style={styles.modalSubtitle}>{selectedItem?.sensor_name || 'Location'}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                    <Ionicons name="close" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Quick Stats */}
                <View style={styles.quickStats}>
                  <View style={styles.quickStatCard}>
                    <Text style={styles.quickStatValue}>{selectedItem.co2_density || 'N/A'}</Text>
                    <Text style={styles.quickStatLabel}>CO₂ (ppm)</Text>
                  </View>
                  <View style={styles.quickStatCard}>
                    <Text style={styles.quickStatValue}>{selectedItem.temperature_c || 'N/A'}</Text>
                    <Text style={styles.quickStatLabel}>Temp (°C)</Text>
                  </View>
                  <View style={styles.quickStatCard}>
                    <Text style={styles.quickStatValue}>
                      {selectedItem.humidity ? parseFloat(selectedItem.humidity).toFixed(0) : 'N/A'}
                    </Text>
                    <Text style={styles.quickStatLabel}>Humidity (%)</Text>
                  </View>
                </View>

                {/* Detailed Information */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Sensor Information</Text>
                  <DetailRow label="Sensor ID"   value={selectedItem.sensor_id}   icon="barcode-outline"    />
                  <DetailRow label="Sensor Name" value={selectedItem.sensor_name} icon="hardware-chip-outline" />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Environmental Readings</Text>
                  <DetailRow label="CO₂ Density"  value={selectedItem.co2_density   ? `${selectedItem.co2_density} ppm`   : null} icon="cloud-outline"        />
                  <DetailRow label="Temperature"  value={selectedItem.temperature_c  ? `${selectedItem.temperature_c}°C`  : null} icon="thermometer-outline"  />
                  <DetailRow label="Humidity"     value={selectedItem.humidity       ? `${parseFloat(selectedItem.humidity).toFixed(1)}%` : null} icon="water-outline" />
                  <DetailRow label="Carbon Level" value={selectedItem.carbon_level}                                               icon="warning-outline"       />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Location & Timing</Text>
                  <DetailRow label="Barangay"     value={selectedItem.barangay_name} icon="location-outline"    />
                  <DetailRow label="Last Reading" value={selectedItem.timestamp || selectedItem.recorded_at} icon="time-outline" />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Enhanced Filter Modal ────────────────────────────────────────────── */}
      <Modal visible={filterModalVisible} animationType="slide" transparent onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.filterModalHeader}>
              <View>
                <Text style={styles.headerTitle}>Filter Places</Text>
                <Text style={styles.filterSubtitle}>Refine your search</Text>
              </View>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#2D2D2D" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}> Barangay / Sensor Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. San Jose, Sensor 01"
                  value={filterName}
                  onChangeText={setFilterName}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}> Carbon Level</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. High, Moderate, Normal"
                  value={filterLevel}
                  onChangeText={setFilterLevel}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TouchableOpacity style={styles.applyButton} onPress={applyFilter}>
                <LinearGradient colors={['#FF5C4D', '#FF8A7A']} style={styles.buttonGradient}>
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetButton} onPress={() => { resetFilter(); setFilterModalVisible(false); }}>
                <Text style={styles.resetButtonText}>Reset All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Enhanced No Data Modal ────────────────────────────────────────────── */}
      <Modal visible={noDataFound} animationType="fade" transparent onRequestClose={() => setNoDataFound(false)}>
        <View style={styles.noDataOverlay}>
          <View style={styles.noDataContent}>
            <View style={styles.noDataIconContainer}>
              <Ionicons name="search-outline" size={52} color="#FF5C4D" />
            </View>
            <Text style={styles.noDataTitle}>No Results Found</Text>
            <Text style={styles.noDataSubtext}>
              We couldn't find any sensors matching your filters. Try adjusting your search criteria.
            </Text>
            <TouchableOpacity style={styles.goBackButton} onPress={() => setNoDataFound(false)}>
              <Text style={styles.goBackText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Enhanced Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8F9FA' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:  { fontSize: 14, color: '#6B7280', marginTop: 8 },

  // ─── Header ──────────────────────────────────────────────────────────────
  headerGradient: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 8,
  },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle:  { fontSize: 26, fontWeight: '800', color: '#2D2D2D', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 1 },
  filterButton: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  filterIndicator: { position: 'absolute', top: 8, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5C4D' },

  // ─── Live Pulse ───────────────────────────────────────────────────────────
  liveContainer:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF2F1', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  pulseWrapper:   { width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
  pulseDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5C4D', position: 'absolute' },
  pulseRing:      { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF5C4D', opacity: 0.3 },
  liveText:       { fontSize: 11, fontWeight: '800', color: '#FF5C4D', letterSpacing: 0.8 },
  countdownText:  { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },

  // ─── List ─────────────────────────────────────────────────────────────────
  listPadding: { paddingHorizontal: 20, paddingBottom: 32 },
  listHeader:  { marginTop: 12, marginBottom: 14 },
  statsCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 14, alignItems: 'center',
    marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statItem:   { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5, left: 15 },
  statValue:  { fontSize: 20, fontWeight: '700', color: '#FF5C4D' },
  statLabel:  { fontSize: 11, color: '#6B7280' },
  statDivider: { width: 1, height: 28, backgroundColor: '#E5E7EB', marginHorizontal: 12 },
  dateText:   { fontSize: 12, fontWeight: '600', color: '#6B7280', textAlign: 'center' },

  // ─── Card ─────────────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, alignItems: 'center',
    marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden',
  },
  cardAccent:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  iconCircle:     { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  iconGradient:   { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  infoContainer:  { flex: 1, marginLeft: 12 },
  placeName:      { fontSize: 15, fontWeight: '700', color: '#2D2D2D', marginBottom: 4 },
  typeRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  levelBadge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 3 },
  levelDot:       { width: 5, height: 5, borderRadius: 2.5 },
  levelText:      { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  metricsRow:     { flexDirection: 'row', gap: 10 },
  metricItem:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:       { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  trendContainer: { alignItems: 'center', gap: 3 },
  trendBadge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, gap: 3 },
  trendText:      { fontWeight: '700', fontSize: 11 },
  trendLabel:     { fontSize: 8, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },

  // ─── Empty State ──────────────────────────────────────────────────────────
  emptyContainer:     { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText:          { fontSize: 18, fontWeight: '700', color: '#2D2D2D', marginTop: 16 },
  emptySubtext:       { fontSize: 14, color: '#9CA3AF', marginTop: 6 },
  clearFilterBtn:     { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FF5C4D' },
  clearFilterText:    { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // ─── Modal Base ───────────────────────────────────────────────────────────
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent:  { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', overflow: 'hidden' },

  // ─── Detail Modal ─────────────────────────────────────────────────────────
  modalHeaderContainer: { overflow: 'hidden' },
  modalHeaderGradient:  { paddingTop: 24, paddingBottom: 20, paddingHorizontal: 24 },
  modalHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:           { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  modalSubtitle:        { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  modalCloseButton:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  modalScroll:          { paddingHorizontal: 24 },
  quickStats:           { flexDirection: 'row', marginTop: 20, marginBottom: 24, gap: 12 },
  quickStatCard:        { flex: 1, backgroundColor: '#F8F9FA', padding: 16, borderRadius: 16, alignItems: 'center', gap: 6 },
  quickStatValue:       { fontSize: 20, fontWeight: '700', color: '#2D2D2D' },
  quickStatLabel:       { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  detailSection:        { marginBottom: 24 },
  sectionTitle:         { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },
  detailRow:            { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailIconContainer:  { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F1', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  detailLabel:          { fontSize: 12, color: '#9CA3AF', marginBottom: 4, fontWeight: '600' },
  detailValue:          { fontSize: 15, color: '#2D2D2D', fontWeight: '600' },

  // ─── Filter Modal ─────────────────────────────────────────────────────────
  filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterSubtitle:    { fontSize: 14, color: '#6B7280', marginTop: 2 },
  closeButton:       { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' },
  filterContent:     { padding: 24 },
  inputGroup:        { marginBottom: 20 },
  inputLabel:        { fontSize: 13, color: '#6B7280', fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:             { borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 14, padding: 16, fontSize: 15, backgroundColor: '#F8F9FA', color: '#2D2D2D', fontWeight: '500' },
  applyButton:       { borderRadius: 14, overflow: 'hidden', marginTop: 8, shadowColor: '#FF5C4D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonGradient:    { padding: 18, alignItems: 'center' },
  applyButtonText:   { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
  resetButton:       { padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 12, backgroundColor: '#F8F9FA' },
  resetButtonText:   { color: '#6B7280', fontWeight: '700', fontSize: 15 },

  // ─── No Data Modal ────────────────────────────────────────────────────────
  noDataOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  noDataContent:        { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 40, alignItems: 'center', width: '100%', maxWidth: 360 },
  noDataIconContainer:  { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FEF2F1', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  noDataTitle:          { fontSize: 22, fontWeight: '800', color: '#2D2D2D', marginBottom: 12 },
  noDataSubtext:        { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  goBackButton:         { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14, backgroundColor: '#FF5C4D', shadowColor: '#FF5C4D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  goBackText:           { color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
});