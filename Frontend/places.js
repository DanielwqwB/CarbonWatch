import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, FlatList, 
  TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl,
  Modal, ScrollView, TextInput
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';

// Store previous values in memory (persists across re-renders)
const previousValues = {};

export default function PlacesScreen() {
  const [establishments, setEstablishments] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [percentageChanges, setPercentageChanges] = useState({});
  
  // Filter toggle: 'Barangay' or 'Establishment'
  const [activeFilter, setActiveFilter] = useState('Barangay');
  
  // Modal for details
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter modal and inputs
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [noDataFound, setNoDataFound] = useState(false);

  const ESTABLISHMENT_API = 'https://bytetech-final1.onrender.com/establishment';
  const BARANGAY_API = 'https://bytetech-final1.onrender.com/barangay';

  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    const change = (((current - previous) / previous) * 100).toFixed(1);
    return parseFloat(change);
  };

  const fetchAllData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setLoading(true);
      }
      
      console.log('🔄 Fetching data at:', new Date().toLocaleTimeString());
      
      const [estResponse, brgyResponse] = await Promise.all([
        fetch(ESTABLISHMENT_API),
        fetch(BARANGAY_API)
      ]);
      
      const estData = await estResponse.json();
      const brgyData = await brgyResponse.json();
      
      // Handle both array and object responses
      const establishments = Array.isArray(estData) ? estData : (estData.data || []);
      const barangays = Array.isArray(brgyData) ? brgyData : (brgyData.data || []);
      
      console.log('✅ Fetched:', establishments.length, 'establishments,', barangays.length, 'barangays');
      
      // Calculate percentage changes
      const changes = {};
      
      // For establishments
      establishments.forEach(est => {
        const key = `est-${est.establishment_id}`;
        const currentValue = parseFloat(est.avg_co2_density);
        
        if (previousValues[key]) {
          // Calculate real change from previous value
          const previousValue = previousValues[key].value;
          changes[key] = calculatePercentageChange(currentValue, previousValue);
          
          console.log(`📊 ${est.establishment_name}:`, {
            previous: previousValue,
            current: currentValue,
            change: changes[key] + '%'
          });
        } else {
          // First time - no previous data yet, show 0%
          changes[key] = 0;
          console.log(`🆕 ${est.establishment_name}: First load, setting baseline`);
        }
        
        // Store current value for next comparison
        previousValues[key] = { 
          value: currentValue,
          timestamp: Date.now()
        };
      });
      
      // For barangays
      barangays.forEach(brgy => {
        const key = `brgy-${brgy.barangay_id}`;
        const currentValue = parseFloat(brgy.density);
        
        if (previousValues[key]) {
          // Calculate real change from previous value
          const previousValue = previousValues[key].value;
          changes[key] = calculatePercentageChange(currentValue, previousValue);
          
          console.log(`📊 Barangay ${brgy.barangay_name}:`, {
            previous: previousValue,
            current: currentValue,
            change: changes[key] + '%'
          });
        } else {
          // First time - no previous data yet, show 0%
          changes[key] = 0;
          console.log(`🆕 Barangay ${brgy.barangay_name}: First load, setting baseline`);
        }
        
        // Store current value for next comparison
        previousValues[key] = { 
          value: currentValue,
          timestamp: Date.now()
        };
      });
      
      console.log('📦 Total tracked items:', Object.keys(previousValues).length);
      
      setPercentageChanges(changes);
      setEstablishments(establishments);
      setBarangays(barangays);
      
      // Set initial filtered results based on active filter
      if (activeFilter === 'Barangay') {
        setFilteredResults(barangays);
      } else {
        setFilteredResults(establishments);
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial load
    fetchAllData(true);
    
    // Auto-refresh every 2 minutes (120000ms = 2 minutes)
    // Change to 30000 for 30 seconds if you want faster updates for testing
    const interval = setInterval(() => {
      console.log('⏰ Auto-refresh triggered');
      fetchAllData(false);
    }, 1800000);
    
    return () => {
      console.log('🧹 Cleaning up interval');
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Update filtered results when filter changes
    const newData = activeFilter === 'Barangay' ? barangays : establishments;
    setFilteredResults(newData);
  }, [activeFilter, barangays, establishments]);

  const onRefresh = () => {
    console.log('👆 Manual refresh');
    setRefreshing(true);
    fetchAllData(false);
  };

  // Detail modal
  const handleItemPress = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  // Filter function
  const applyFilter = () => {
    const dataSource = activeFilter === 'Barangay' ? barangays : establishments;
    
    const results = dataSource.filter(item => {
      const itemName = activeFilter === 'Barangay' ? item.barangay_name : item.establishment_name;
      const matchesName = filterName ? itemName.toLowerCase().includes(filterName.toLowerCase()) : true;
      const matchesLocation = filterLocation ? item.city?.toLowerCase().includes(filterLocation.toLowerCase()) : true;
      const matchesDate = filterDate ? item.date === filterDate : true;
      return matchesName && matchesLocation && matchesDate;
    });

    setFilteredResults(results);
    setFilterModalVisible(false);

    if (results.length === 0) {
      setNoDataFound(true);
    }
  };

  const renderItem = ({ item }) => {
    const isBarangay = activeFilter === 'Barangay';
    const name = isBarangay ? item.barangay_name : item.establishment_name;
    const type = isBarangay ? item.city : item.establishment_type;
    
    // Handle different field names from API
    const density = item.density || item.avg_co2_density;
    const temperature = item.temperature_c || item.avg_temperature_c;
    
    // Get percentage change
    const key = isBarangay ? `brgy-${item.barangay_id}` : `est-${item.establishment_id}`;
    const percentChange = percentageChanges[key] || 0;
    const isIncrease = percentChange > 0;
    const isDecrease = percentChange < 0;
    const isNoChange = percentChange === 0;
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons 
            name={isBarangay ? 'map-marker' : getIcon(item.establishment_type)} 
            size={26} 
            color={isBarangay ? '#FF6B6B' : '#5B9A8B'} 
          />
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.establishmentName}>{name}</Text>
          <Text style={styles.densityValue}>
            {density?.toFixed(2)} {isBarangay ? 'Density' : 'Tons'} • {temperature}°C
          </Text>
        </View>

        {!isNoChange && (
          <View style={styles.trendBadge}>
            <Ionicons 
              name="triangle" 
              size={10} 
              color={isIncrease ? '#ff0000' : '#00c853'} 
              style={[styles.trendIcon, isDecrease && { transform: [{ rotate: '180deg' }] }]} 
            />
            <Text style={[styles.trendText, { color: isIncrease ? '#ff0000' : '#00c853' }]}>
              {Math.abs(percentChange)}%
            </Text>
            <Feather 
              name={isIncrease ? 'arrow-up' : 'arrow-down'} 
              size={16} 
              color={isIncrease ? '#ff0000' : '#00c853'} 
            />
          </View>
        )}
        
        {isNoChange && (
          <View style={styles.trendBadge}>
            <Ionicons name="remove" size={16} color="#999" />
            <Text style={[styles.trendText, { color: '#999' }]}>0%</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'hardware': return 'tools';
      case 'mall': return 'shopping';
      case 'restaurant': return 'food';
      case 'resort': return 'island';
      case 'hotel': return 'bed';
      default: return 'store-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Places</Text>
        <TouchableOpacity 
          style={styles.downloadCircle} 
          onPress={() => setFilterModalVisible(true)}
        >
          <Feather name="filter" size={18} color="#4A665E" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A665E" />
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(item, index) => {
            // Use the correct ID field based on filter type
            if (activeFilter === 'Barangay') {
              return `barangay-${item.barangay_id || index}`;
            } else {
              return `establishment-${item.establishment_id || index}`;
            }
          }}
          renderItem={renderItem}
          contentContainerStyle={styles.listPadding}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name={activeFilter === 'Barangay' ? 'map-marker-off' : 'store-off'} 
                size={64} 
                color="#CCC" 
              />
              <Text style={styles.emptyText}>No {activeFilter.toLowerCase()}s found</Text>
              <Text style={styles.emptySubtext}>Pull down to refresh</Text>
            </View>
          )}
          ListHeaderComponent={() => (
            <View>
              <Text style={styles.subHeaderText}>
                Top 20% Emission Contributors • Updates every 30 min
              </Text>
              
              {/* Filter Toggle */}
              <View style={styles.filterRow}>
                <TouchableOpacity 
                  style={[
                    styles.filterToggle, 
                    activeFilter === 'Barangay' && styles.filterToggleActive
                  ]}
                  onPress={() => setActiveFilter('Barangay')}
                >
                  <Text style={[
                    styles.filterToggleText,
                    activeFilter === 'Barangay' && styles.filterToggleTextActive
                  ]}>
                    Barangay
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.filterToggle, 
                    activeFilter === 'Establishment' && styles.filterToggleActive
                  ]}
                  onPress={() => setActiveFilter('Establishment')}
                >
                  <Text style={[
                    styles.filterToggleText,
                    activeFilter === 'Establishment' && styles.filterToggleTextActive
                  ]}>
                    Establishment
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateSelector}>
                  <MaterialCommunityIcons name="calendar" size={16} color="#FF6B6B" />
                  <Text style={styles.filterText}> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                  <Feather name="chevron-down" size={16} color="#999" style={{ marginLeft: 5 }} />
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Place Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#4A665E" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {activeFilter === 'Barangay' ? (
                  <>
                    <DetailRow label="Barangay Name" value={selectedItem.barangay_name} icon="business" />
                    <DetailRow label="City" value={selectedItem.city} icon="location" />
                    <DetailRow label="Latitude" value={selectedItem.latitude} icon="map" />
                    <DetailRow label="Longitude" value={selectedItem.longitude} icon="map" />
                    <DetailRow label="Density" value={selectedItem.density || selectedItem.avg_co2_density} icon="people" />
                    <DetailRow label="Temperature" value={`${selectedItem.temperature_c || selectedItem.avg_temperature_c}°C`} icon="thermometer" />
                  </>
                ) : (
                  <>
                    <DetailRow label="Name" value={selectedItem.establishment_name} icon="business" />
                    <DetailRow label="Type" value={selectedItem.establishment_type} icon="layers" />
                    <DetailRow label="Barangay" value={selectedItem.barangay_name} icon="location" />
                    <DetailRow label="Latitude" value={selectedItem.latitude} icon="map" />
                    <DetailRow label="Longitude" value={selectedItem.longitude} icon="map" />
                    <DetailRow label="CO2 Density" value={`${selectedItem.avg_co2_density || selectedItem.density} Tons`} icon="leaf" />
                    <DetailRow label="Temperature" value={`${selectedItem.avg_temperature_c || selectedItem.temperature_c}°C`} icon="thermometer" />
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Places</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#4A665E" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.detailLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter place name"
                value={filterName}
                onChangeText={setFilterName}
              />

              <Text style={styles.detailLabel}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter location"
                value={filterLocation}
                onChangeText={setFilterLocation}
              />

              <Text style={styles.detailLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter date"
                value={filterDate}
                onChangeText={setFilterDate}
              />

              <TouchableOpacity style={styles.applyButton} onPress={applyFilter}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Apply Filter</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* No Data Found Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={noDataFound}
        onRequestClose={() => setNoDataFound(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 18, color: '#555', marginBottom: 20 }}>No data found</Text>
            <TouchableOpacity onPress={() => setNoDataFound(false)} style={styles.goBackButton}>
              <Text style={{ color: '#4A665E', fontWeight: 'bold' }}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper component for Modal Rows
const DetailRow = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={20} color="#5B9A8B" style={styles.rowIcon} />
    <View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'N/A'}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 25, fontWeight: '700', color: '#333', marginTop: 20 },
  downloadCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  listPadding: { paddingHorizontal: 20, paddingBottom: 20 },
  subHeaderText: { fontSize: 15, color: '#666', marginBottom: 15 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  filterToggle: { 
    flex: 1, 
    backgroundColor: '#F0F0F0', 
    padding: 12, 
    borderRadius: 12, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  filterToggleActive: { 
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50'
  },
  filterToggleText: { 
    color: '#666', 
    fontWeight: '600',
    fontSize: 13
  },
  filterToggleTextActive: { 
    color: '#FFF'
  },
  dateRow: { marginBottom: 20 },
  dateSelector: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 12, alignItems: 'center', elevation: 1 },
  unitSelector: { backgroundColor: '#FFF', padding: 10, borderRadius: 12, alignItems: 'center', flex: 1, elevation: 1 },
  filterText: { color: '#555', fontWeight: '500' },
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 20, alignItems: 'center', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F7F6', justifyContent: 'center', alignItems: 'center' },
  infoContainer: { flex: 1, marginLeft: 15 },
  establishmentName: { fontSize: 17, fontWeight: '600', color: '#333' },
  densityValue: { fontSize: 14, color: '#666' },
  trendBadge: { flexDirection: 'row', alignItems: 'center' },
  trendIcon: { marginRight: 2 },
  trendText: { color: '#88B04B', fontWeight: 'bold', fontSize: 16, marginRight: 2 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowIcon: { marginRight: 15 },
  detailLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase' },
  detailValue: { fontSize: 16, color: '#333', fontWeight: '500' },

  // Filter Modal Inputs & Buttons
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 14, backgroundColor: '#FAFAFA' },
  applyButton: { backgroundColor: '#4A665E', padding: 15, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  goBackButton: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#4A665E' },
  
  // Empty State
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#999', 
    marginTop: 15 
  },
  emptySubtext: { 
    fontSize: 14, 
    color: '#BBB', 
    marginTop: 5 
  }
});