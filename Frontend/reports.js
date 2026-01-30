import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';

const API_URL = 'https://bytetech.onrender.com/api/reports';
const screenWidth = Dimensions.get('window').width;

export default function Reports({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [establishments, setEstablishments] = useState([]);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'CARBON'
  const [selectedMonth, setSelectedMonth] = useState('December 2026');

  const [carbonStats, setCarbonStats] = useState({ red: 0, yellow: 0, green: 0 });
  const [highestEmission, setHighestEmission] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      const data = await res.json();
      setEstablishments(data || []);

      // Calculate total emissions per indicator
      const totalRed = data
        .filter(e => e.co2_emission > 50)
        .reduce((sum, e) => sum + e.co2_emission, 0);
      const totalYellow = data
        .filter(e => e.co2_emission > 20 && e.co2_emission <= 50)
        .reduce((sum, e) => sum + e.co2_emission, 0);
      const totalGreen = data
        .filter(e => e.co2_emission <= 20)
        .reduce((sum, e) => sum + e.co2_emission, 0);
      setCarbonStats({ red: totalRed, yellow: totalYellow, green: totalGreen });

      // Find highest emission barangay
      const maxEmission = data.reduce(
        (prev, curr) => (curr.co2_emission > (prev?.co2_emission || 0) ? curr : prev),
        null
      );
      setHighestEmission(maxEmission);

    } catch (err) {
      console.error('API Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const totalEmission = establishments.reduce(
    (sum, item) => sum + (item.co2_emission || 0),
    0
  );

  const filteredData =
    filter === 'CARBON'
      ? establishments.filter(e => e.co2_emission > 0)
      : establishments;

  const openAllReports = () => setFilter('ALL');

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Reporting</Text>

        <TouchableOpacity
          onPress={() => setFilter(filter === 'ALL' ? 'CARBON' : 'ALL')}
        >
          <Ionicons name="filter" size={22} />
        </TouchableOpacity>
      </View>

      {/* FILTER BUTTONS */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'ALL' && styles.activeBtn]}
          onPress={() => {
            setFilter('ALL');
            openAllReports();
          }}
        >
          <Text style={styles.filterText}>All Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, filter === 'CARBON' && styles.activeBtn]}
          onPress={() => setFilter('CARBON')}
        >
          <Text style={styles.filterText}>Carbon Reports</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* MONTH SELECT */}
        <TouchableOpacity style={styles.monthPicker}>
          <Ionicons name="calendar" size={18} />
          <Text style={styles.monthText}>{selectedMonth}</Text>
          <Ionicons name="chevron-down" size={18} />
        </TouchableOpacity>

        {/* SUMMARY */}
        <View style={styles.card}>
          <Text style={{ fontSize: 14, color: '#555', marginBottom: 6 }}>
            Report Month: {selectedMonth}
          </Text>
          <Text style={styles.cardTitle}>Carbon Emission Summary</Text>
          <Text style={styles.bigNumber}>{totalEmission} Tons</Text>
          <Text style={styles.subText}>{filteredData.length} Establishments</Text>
        </View>

        {/* PIE CHART & HIGHEST EMISSION */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Carbon Emission Indicator</Text>
          <PieChart
            data={[
              { name: 'Red', population: carbonStats.red, color: 'red', legendFontColor: '#333', legendFontSize: 12 },
              { name: 'Yellow', population: carbonStats.yellow, color: 'orange', legendFontColor: '#333', legendFontSize: 12 },
              { name: 'Green', population: carbonStats.green, color: 'green', legendFontColor: '#333', legendFontSize: 12 },
            ]}
            width={screenWidth - 40}
            height={220}
            chartConfig={{ color: () => `rgba(0,0,0,1)` }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />

          {highestEmission && (
            <Text style={{ marginTop: 12, fontWeight: 'bold' }}>
              Highest Carbon Emission: {highestEmission.name} ({highestEmission.co2_emission} Tons)
            </Text>
          )}
        </View>

        {/* ESTABLISHMENT LIST */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>By Establishment</Text>
          {filteredData.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.listItem}
              onPress={() => navigation.navigate('Establishment', { id: item._id })}
            >
              <View>
                <Text style={styles.listTitle}>{item.name || 'Unknown'}</Text>
                <Text style={styles.listSub}>CO₂: {item.co2_emission || 0} Tons</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))}
        </View>

        {/* AI PREDICTION CARD (placeholder, only for CARBON filter) */}
        {filter === 'CARBON' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Weekly AI Prediction</Text>
            <Text style={{ color: '#555', marginTop: 6 }}>
              Predicted CO₂ emissions for next week based on historical data.
            </Text>
            <Text style={{ color: '#777', marginTop: 4 }}>
              (AI prediction will appear here once backend is connected)
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },

  filterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ddd',
    marginHorizontal: 6,
  },
  activeBtn: { backgroundColor: '#4CAF50' },
  filterText: { color: '#fff', fontSize: 12 },

  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    justifyContent: 'space-between',
  },
  monthText: { fontWeight: 'bold' },

  card: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 14,
    borderRadius: 12,
  },
  cardTitle: { fontWeight: 'bold', marginBottom: 8 },
  bigNumber: { fontSize: 26, fontWeight: 'bold', color: '#4CAF50' },
  subText: { color: '#777' },

  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: '#eee',
  },
  listTitle: { fontWeight: 'bold' },
  listSub: { color: '#777', fontSize: 12 },
});
