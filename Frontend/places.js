import React, { useState, useEffect } from 'react';
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

// ─── Track previous CO₂ values for trend badges ──────────────────────────────
const previousValues = {};

const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
};

// ─── Carbon level → colour with gradient support ─────────────────────────────
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

// ─── Enhanced Detail Row ──────────────────────────────────────────────────────
const DetailRow = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIconContainer}>
      <MaterialCommunityIcons name={icon} size={22} color="#FF5C4D" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value ?? 'N/A'}</Text>
    </View>
  </View>
);

// ─── Animated Card Component ──────────────────────────────────────────────────
const AnimatedCard = ({ item, onPress, percentageChanges }) => {
  const scaleAnim = useState(new Animated.Value(1))[0];

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

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
        <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
        
        {/* Icon with gradient background */}
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="home-group" size={22} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.placeName} numberOfLines={1}>
            {item.barangay_name || item.sensor_name || 'Unknown'}
          </Text>
          <View style={styles.typeRow}>
            {item.carbon_level && (
              <View style={[styles.levelBadge, { backgroundColor: colors.primary + '15' }]}>
                <View style={styles.levelDot} />
                <Text style={[styles.levelText, { color: colors.primary }]}>
                  {item.carbon_level}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <MaterialCommunityIcons name="molecule-co2" size={12} color="#6B7280" />
              <Text style={styles.metaText}>{co2} ppm</Text>
            </View>
            {temp != null && (
              <View style={styles.metricItem}>
                <MaterialCommunityIcons name="thermometer" size={12} color="#6B7280" />
                <Text style={styles.metaText}>{temp}°C</Text>
              </View>
            )}
          </View>
        </View>

        {/* Enhanced Trend Badge */}
        <View style={styles.trendContainer}>
          <View style={[
            styles.trendBadge,
            {
              backgroundColor: isFlat ? '#F3F4F6' : isUp ? '#FEE2E2' : '#DCFCE7',
              borderWidth: 1,
              borderColor: isFlat ? '#E5E7EB' : isUp ? '#FECACA' : '#BBF7D0',
            },
          ]}>
            <MaterialCommunityIcons 
              name={isFlat ? 'minus' : isUp ? 'trending-up' : 'trending-down'} 
              size={12} 
              color={isFlat ? '#9CA3AF' : isUp ? '#DC2626' : '#16A34A'} 
            />
            <Text style={[
              styles.trendText,
              { color: isFlat ? '#9CA3AF' : isUp ? '#DC2626' : '#16A34A' },
            ]}>
              {Math.abs(pct)}%
            </Text>
          </View>
          <Text style={styles.trendLabel}>vs. last</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

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

      const sensorList = await sensorRes.json();
      const dataJson = await dataRes.json();
      const dataList = Array.isArray(dataJson) ? dataJson : (dataJson.data || []);

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
    const interval = setInterval(() => fetchAllData(false), 1_800_000);
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

  const hasActiveFilters = filterName || filterLevel;

  // ── Render Item ────────────────────────────────────────────────────────────
  const renderItem = ({ item }) => (
    <AnimatedCard
      item={item}
      onPress={() => { setSelectedItem(item); setModalVisible(true); }}
      percentageChanges={percentageChanges}
    />
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header with gradient */}
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FA']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Places</Text>
            <Text style={styles.headerSubtitle}>Real-time sensor monitoring</Text>
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            {hasActiveFilters && <View style={styles.filterIndicator} />}
            <Ionicons name="options-outline" size={20} color="#2D2D2D" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF5C4D" />
          <Text style={styles.loadingText}>Loading sensor data...</Text>
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
                  <Text style={styles.statValue}>{filteredResults.length}</Text>
                  <Text style={styles.statLabel}>Active Sensors</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="update" size={14} color="#6B7280" />
                  <Text style={styles.statLabel}>Updates every 30 min</Text>
                </View>
              </View>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name="map-search-outline" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyText}>No sensors found</Text>
              <Text style={styles.emptySubtext}>
                {hasActiveFilters ? 'Try adjusting your filters' : 'Pull down to refresh'}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity onPress={resetFilter} style={styles.clearFilterBtn}>
                  <Text style={styles.clearFilterText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {/* ── Enhanced Detail Modal ─────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header with gradient accent */}
            <View style={styles.modalHeaderContainer}>
              <LinearGradient
                colors={['#FF5C4D', '#FF7A6B']}
                style={styles.modalHeaderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Sensor Details</Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedItem?.barangay_name || 'Location'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setModalVisible(false)}
                    style={styles.modalCloseButton}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>

            {selectedItem && (
              <ScrollView 
                showsVerticalScrollIndicator={false}
                style={styles.modalScroll}
              >
                {/* Quick Stats */}
                <View style={styles.quickStats}>
                  <View style={styles.quickStatCard}>
                    <MaterialCommunityIcons name="molecule-co2" size={24} color="#FF5C4D" />
                    <Text style={styles.quickStatValue}>
                      {selectedItem.co2_density || 'N/A'}
                    </Text>
                    <Text style={styles.quickStatLabel}>CO₂ (ppm)</Text>
                  </View>
                  <View style={styles.quickStatCard}>
                    <MaterialCommunityIcons name="thermometer" size={24} color="#FF5C4D" />
                    <Text style={styles.quickStatValue}>
                      {selectedItem.temperature_c || 'N/A'}
                    </Text>
                    <Text style={styles.quickStatLabel}>Temp (°C)</Text>
                  </View>
                  <View style={styles.quickStatCard}>
                    <MaterialCommunityIcons name="water-percent" size={24} color="#FF5C4D" />
                    <Text style={styles.quickStatValue}>
                      {selectedItem.humidity ? parseFloat(selectedItem.humidity).toFixed(0) : 'N/A'}
                    </Text>
                    <Text style={styles.quickStatLabel}>Humidity (%)</Text>
                  </View>
                </View>

                {/* Detailed Information */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Sensor Information</Text>
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
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Environmental Readings</Text>
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
                    label="Heat Index"
                    value={selectedItem.heat_index_c != null
                      ? `${selectedItem.heat_index_c}°C` : null}
                    icon="fire"
                  />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Location & Timing</Text>
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
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Enhanced Filter Modal ──────────────────────────────────────────── */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.filterModalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filter Places</Text>
                <Text style={styles.filterSubtitle}>Refine your search</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setFilterModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#2D2D2D" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <MaterialCommunityIcons name="map-marker" size={14} color="#6B7280" />
                  {' '}Barangay / Sensor Name
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Triangulo"
                  placeholderTextColor="#9CA3AF"
                  value={filterName}
                  onChangeText={setFilterName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <MaterialCommunityIcons name="gauge" size={14} color="#6B7280" />
                  {' '}Carbon Level
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="NORMAL, LOW, HIGH, VERY HIGH"
                  placeholderTextColor="#9CA3AF"
                  value={filterLevel}
                  onChangeText={setFilterLevel}
                />
              </View>

              <TouchableOpacity style={styles.applyButton} onPress={applyFilter}>
                <LinearGradient
                  colors={['#FF5C4D', '#FF7A6B']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => { resetFilter(); setFilterModalVisible(false); }}
              >
                <Text style={styles.resetButtonText}>Reset All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Enhanced No Data Modal ──────────────────────────────────────────── */}
      <Modal
        visible={noDataFound}
        transparent
        animationType="fade"
        onRequestClose={() => setNoDataFound(false)}
      >
        <View style={styles.noDataOverlay}>
          <View style={styles.noDataContent}>
            <View style={styles.noDataIconContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={72} color="#FF5C4D" />
            </View>
            <Text style={styles.noDataTitle}>No Results Found</Text>
            <Text style={styles.noDataSubtext}>
              We couldn't find any sensors matching your filters. Try adjusting your search criteria.
            </Text>
            <TouchableOpacity 
              style={styles.goBackButton} 
              onPress={() => setNoDataFound(false)}
            >
              <Text style={styles.goBackText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Enhanced Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 12,
  },
  
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },

  // ─── Header ───────────────────────────────────────────────────────────────
  headerGradient: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 50,
    paddingBottom: 8,
  },
  
  headerTitle: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: '#2D2D2D',
    letterSpacing: -0.5,
  },
  
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  
  filterButton: { 
    width: 42, 
    height: 42, 
    borderRadius: 12, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  
  filterIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5C4D',
  },

  // ─── List ─────────────────────────────────────────────────────────────────
  listPadding: { 
    paddingHorizontal: 20, 
    paddingBottom: 32,
  },
  
  listHeader: {
    marginTop: 12,
    marginBottom: 14,
  },
  
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  
  statItem: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF5C4D',
  },
  
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  
  dateText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: '#6B7280',
    textAlign: 'center',
  },

  // ─── Card ─────────────────────────────────────────────────────────────────
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#FFFFFF', 
    padding: 14, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginBottom: 10, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2,
    overflow: 'hidden',
  },
  
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  
  iconCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 14, 
    justifyContent: 'center', 
    alignItems: 'center',
    overflow: 'hidden',
  },
  
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  infoContainer: { 
    flex: 1, 
    marginLeft: 12,
  },
  
  placeName: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#2D2D2D',
    marginBottom: 4,
  },
  
  typeRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 5,
  },
  
  levelBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 6,
    gap: 3,
  },
  
  levelDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'currentColor',
  },
  
  levelText: { 
    fontSize: 10, 
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  
  metaText: { 
    fontSize: 11, 
    color: '#6B7280',
    fontWeight: '500',
  },
  
  trendContainer: {
    alignItems: 'center',
    gap: 3,
  },
  
  trendBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8, 
    paddingVertical: 5,
    borderRadius: 8,
    gap: 3,
  },
  
  trendText: { 
    fontWeight: '700', 
    fontSize: 11,
  },
  
  trendLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ─── Empty State ──────────────────────────────────────────────────────────
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 80,
  },
  
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  emptyText: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#2D2D2D', 
    marginTop: 16,
  },
  
  emptySubtext: { 
    fontSize: 14, 
    color: '#9CA3AF', 
    marginTop: 6,
  },
  
  clearFilterBtn: { 
    marginTop: 20, 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 12, 
    backgroundColor: '#FF5C4D',
  },
  
  clearFilterText: { 
    color: '#FFFFFF', 
    fontWeight: '700',
    fontSize: 14,
  },

  // ─── Modal Base ───────────────────────────────────────────────────────────
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end',
  },
  
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28,
    maxHeight: '92%',
    overflow: 'hidden',
  },

  // ─── Detail Modal ─────────────────────────────────────────────────────────
  modalHeaderContainer: {
    overflow: 'hidden',
  },
  
  modalHeaderGradient: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  
  modalTitle: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalScroll: {
    paddingHorizontal: 24,
  },
  
  quickStats: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 24,
    gap: 12,
  },
  
  quickStatCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
  },
  
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D2D',
  },
  
  quickStatLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  
  detailSection: {
    marginBottom: 24,
  },
  
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16, 
    paddingBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6',
  },
  
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  
  detailLabel: { 
    fontSize: 12, 
    color: '#9CA3AF', 
    marginBottom: 4,
    fontWeight: '600',
  },
  
  detailValue: { 
    fontSize: 15, 
    color: '#2D2D2D', 
    fontWeight: '600',
  },

  // ─── Filter Modal ─────────────────────────────────────────────────────────
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  
  filterSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  filterContent: {
    padding: 24,
  },
  
  inputGroup: {
    marginBottom: 20,
  },
  
  inputLabel: { 
    fontSize: 13, 
    color: '#6B7280', 
    fontWeight: '700', 
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  input: { 
    borderWidth: 2, 
    borderColor: '#E5E7EB', 
    borderRadius: 14, 
    padding: 16, 
    fontSize: 15, 
    backgroundColor: '#F8F9FA', 
    color: '#2D2D2D',
    fontWeight: '500',
  },
  
  applyButton: { 
    borderRadius: 14, 
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#FF5C4D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  buttonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  
  applyButtonText: { 
    color: '#FFFFFF', 
    fontWeight: '800', 
    fontSize: 16,
    letterSpacing: 0.3,
  },
  
  resetButton: { 
    padding: 16, 
    borderRadius: 14, 
    alignItems: 'center', 
    marginTop: 12,
    backgroundColor: '#F8F9FA',
  },
  
  resetButtonText: { 
    color: '#6B7280', 
    fontWeight: '700', 
    fontSize: 15,
  },

  // ─── No Data Modal ────────────────────────────────────────────────────────
  noDataOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  
  noDataContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  
  noDataIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FEF2F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  noDataTitle: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#2D2D2D',
    marginBottom: 12,
  },
  
  noDataSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  
  goBackButton: { 
    paddingHorizontal: 40, 
    paddingVertical: 14, 
    borderRadius: 14,
    backgroundColor: '#FF5C4D',
    shadowColor: '#FF5C4D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  goBackText: { 
    color: '#FFFFFF', 
    fontWeight: '800', 
    fontSize: 15,
    letterSpacing: 0.3,
  },
});