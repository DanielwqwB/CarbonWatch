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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';

const BASE_API_URL = 'https://bytetech-final1.onrender.com/sensor_data';
const screenWidth = Dimensions.get('window').width;

export default function Reports({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [establishments, setEstablishments] = useState([]);
  const [barangayData, setBarangayData] = useState([]);
  const [reportType, setReportType] = useState('monthly'); // 'monthly' or 'weekly'
  const [selectedMonth, setSelectedMonth] = useState('December 2026');
  const [carbonStats, setCarbonStats] = useState({
    red: 0,
    yellow: 0,
    green: 0
  });

  useEffect(() => {
    fetchReports();
    fetchBarangayData();
  }, []);

  // Refetch data when report type changes
  useEffect(() => {
    fetchReports();
  }, [reportType]);

  const fetchBarangayData = async () => {
    try {
      const res = await fetch('https://bytetech-final1.onrender.com/barangay');
      const response = await res.json();
      
      if (response && response.data) {
        // Calculate CO2 emissions based on temperature (higher temp = higher emissions)
        const barangaysWithEmissions = response.data.map(barangay => {
          // Formula: Base emission (10) + temperature factor
          // Higher density areas get multiplier
          const densityMultiplier = barangay.density === 'High' ? 1.5 : 1.0;
          const co2_emission = ((barangay.temperature_c - 25) * 2 * densityMultiplier) + 10;
          
          return {
            ...barangay,
            co2_emission: Math.max(co2_emission, 5) // Minimum 5 tons
          };
        });
        
        // Sort by emissions and get top barangays
        const sortedBarangays = barangaysWithEmissions
          .sort((a, b) => b.co2_emission - a.co2_emission);
        
        setBarangayData(sortedBarangays);
      }
    } catch (err) {
      console.error('Barangay API Error:', err);
      setBarangayData([]);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Determine API endpoint based on report type
      const apiEndpoint = reportType === 'monthly' 
        ? `https://bytetech-final1.onrender.com/reports/monthly` 
        : `https://bytetech-final1.onrender.com/reports/weekly`;
      
      const res = await fetch(apiEndpoint);
      const responseData = await res.json();
      
      // Handle different API response structures
      let data = [];
      
      // Check if response is an array
      if (Array.isArray(responseData)) {
        data = responseData;
      } 
      // Check if response has a data property that's an array
      else if (responseData && Array.isArray(responseData.data)) {
        data = responseData.data;
      }
      // Check if response has an establishments property
      else if (responseData && Array.isArray(responseData.establishments)) {
        data = responseData.establishments;
      }
      // Check if response has a reports property
      else if (responseData && Array.isArray(responseData.reports)) {
        data = responseData.reports;
      }
      
      console.log('API Response:', responseData);
      console.log('Processed Data:', data);
      
      setEstablishments(data);

      // Calculate carbon stats from API data
      if (data.length > 0) {
        const totalRed = data.filter(e => e.co2_emission > 50).reduce((sum, e) => sum + e.co2_emission, 0);
        const totalYellow = data.filter(e => e.co2_emission > 20 && e.co2_emission <= 50).reduce((sum, e) => sum + e.co2_emission, 0);
        const totalGreen = data.filter(e => e.co2_emission <= 20).reduce((sum, e) => sum + e.co2_emission, 0);

        setCarbonStats({
          red: totalRed,
          yellow: totalYellow,
          green: totalGreen
        });
      } else {
        setCarbonStats({ red: 0, yellow: 0, green: 0 });
      }
    } catch (err) {
      console.error('API Error:', err);
      setEstablishments([]);
      setCarbonStats({ red: 0, yellow: 0, green: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
    fetchBarangayData();
  };

  // Process API data for charts
  const processChartData = () => {
    if (!establishments || !Array.isArray(establishments) || establishments.length === 0) {
      // Fallback to default empty data
      return reportType === 'monthly' 
        ? { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }] }
        : { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], datasets: [{ data: [0, 0, 0, 0] }] };
    }

    // Extract chart data from API response
    if (reportType === 'monthly') {
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyEmissions = establishments.slice(0, 12).map(e => e.co2_emission || 0);
      
      // Pad with zeros if less than 12 months
      while (monthlyEmissions.length < 12) {
        monthlyEmissions.push(0);
      }
      
      return {
        labels: monthLabels,
        datasets: [{ data: monthlyEmissions }]
      };
    } else {
      const weeklyEmissions = establishments.slice(0, 4).map(e => e.co2_emission || 0);
      
      // Pad with zeros if less than 4 weeks
      while (weeklyEmissions.length < 4) {
        weeklyEmissions.push(0);
      }
      
      return {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{ data: weeklyEmissions }]
      };
    }
  };

  const chartData = processChartData();
  
  // Calculate total emissions from actual data
  const calculateTotalEmission = () => {
    if (!establishments || !Array.isArray(establishments) || establishments.length === 0) {
      return 0;
    }
    const total = establishments.reduce((sum, e) => sum + (e.co2_emission || 0), 0);
    return Math.round(total);
  };

  // Calculate target and percentage in real-time
  const calculateTargetInfo = () => {
    const total = calculateTotalEmission();
    const target = reportType === 'monthly' ? 375 : 100;
    const percentage = total > 0 ? Math.round((total / target) * 100) : 0;
    return `${percentage}% of ${target} Tons`;
  };

  // Calculate trend based on comparison with previous period
  const calculateTrend = () => {
    if (!establishments || !Array.isArray(establishments) || establishments.length === 0) {
      return { value: '0%', direction: 'up' };
    }

    // For monthly: compare current month vs previous month
    // For weekly: compare current week vs previous week
    const dataLength = reportType === 'monthly' ? 12 : 4;
    const currentData = establishments.slice(0, dataLength);
    
    if (currentData.length < 2) {
      return { value: '0%', direction: 'neutral' };
    }

    // Get most recent and previous period
    const current = currentData[0]?.co2_emission || 0;
    const previous = currentData[1]?.co2_emission || 0;

    if (previous === 0) {
      return { value: '0%', direction: 'neutral' };
    }

    const change = ((current - previous) / previous) * 100;
    const absChange = Math.abs(Math.round(change));
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
    
    const period = reportType === 'monthly' ? 'Last Month' : 'Last Week';
    return { 
      value: `${absChange}% vs. ${period}`, 
      direction 
    };
  };

  const totalEmission = `${calculateTotalEmission()} Tons`;
  const targetPercentage = calculateTargetInfo();
  const trend = calculateTrend();
  const trendValue = trend.value;

  // Process top barangays
  const getTopBarangays = () => {
    if (!barangayData || barangayData.length === 0) {
      return [
        { name: 'San Francisco', value: 66 },
        { name: 'Villanueva Ave.', value: 19 },
        { name: 'Other', value: 15 }
      ];
    }

    // Get top 2 barangays by emissions
    const top2 = barangayData.slice(0, 2);
    const totalEmissions = barangayData.reduce((sum, b) => sum + b.co2_emission, 0);
    const top2Emissions = top2.reduce((sum, b) => sum + b.co2_emission, 0);
    const othersEmissions = totalEmissions - top2Emissions;

    const top1Percentage = Math.round((top2[0].co2_emission / totalEmissions) * 100);
    const top2Percentage = Math.round((top2[1].co2_emission / totalEmissions) * 100);
    const othersPercentage = 100 - top1Percentage - top2Percentage;

    return [
      { name: top2[0].barangay_name, value: top1Percentage },
      { name: top2[1].barangay_name, value: top2Percentage },
      { name: 'Other', value: othersPercentage }
    ];
  };

  const topBarangays = getTopBarangays();

  // --- MAIN SCREEN ---
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10, color: '#777' }}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reporting</Text>
        <TouchableOpacity>
          <Ionicons name="download-outline" size={24} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* TOGGLE BUTTONS - Monthly/Weekly */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              reportType === 'monthly' && styles.toggleButtonActive
            ]}
            onPress={() => setReportType('monthly')}
          >
            <Text style={[
              styles.toggleText,
              reportType === 'monthly' && styles.toggleTextActive
            ]}>
              Monthly Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              reportType === 'weekly' && styles.toggleButtonActive
            ]}
            onPress={() => setReportType('weekly')}
          >
            <Text style={[
              styles.toggleText,
              reportType === 'weekly' && styles.toggleTextActive
            ]}>
              Weekly Report
            </Text>
          </TouchableOpacity>
        </View>

        {/* DATE SELECTOR */}
        <View style={styles.dateCard}>
          <View style={styles.rowCenter}>
            <MaterialCommunityIcons name="calendar-month" size={20} color="#4CAF50" />
            <Text style={styles.dateText}>
              {reportType === 'monthly' ? selectedMonth : 'January 21 - 27, 2026'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#777" />
        </View>

        {/* 1. CARBON EMISSION SUMMARY CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Carbon Emission Summary</Text>
          </View>

          <View style={styles.summaryTopRow}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="leaf" size={32} color="#4CAF50" />
              <View style={styles.co2Badge}>
                <Text style={styles.co2Text}>CO₂</Text>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <Text style={styles.bigNumber}>{totalEmission}</Text>
              <Text style={styles.unitText}>{targetPercentage}</Text>
              <View style={styles.trendRow}>
                <MaterialCommunityIcons 
                  name={trend.direction === 'up' ? 'triangle' : trend.direction === 'down' ? 'triangle-down' : 'minus'} 
                  size={12} 
                  color={trend.direction === 'up' ? '#D32F2F' : trend.direction === 'down' ? '#4CAF50' : '#777'} 
                />
                <Text style={[
                  styles.trendText,
                  { color: trend.direction === 'up' ? '#D32F2F' : trend.direction === 'down' ? '#4CAF50' : '#777' }
                ]}>
                  {trendValue}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Top Barangays List */}
          <View style={styles.locationList}>
            {topBarangays.map((loc, index) => (
              <View key={index} style={styles.locationRow}>
                <Text style={styles.locName}>{loc.name}</Text>
                <Text style={styles.locValue}>{loc.value}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 2. CITY-WIDE CHART */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>
                City-wide {reportType === 'monthly' ? 'Monthly' : 'Weekly'}, CO₂ Emission
              </Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              width={screenWidth - 64}
              height={200}
              yAxisSuffix="T"
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                barPercentage: 0.5,
              }}
              style={{
                borderRadius: 16,
                marginTop: 10
              }}
              showValuesOnTopOfBars={false}
              withInnerLines={false}
            />

            {/* Target Line Overlay */}
            <View style={styles.targetLineContainer}>
              <View style={styles.dashedLine} />
            </View>
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>
                Target ({reportType === 'monthly' ? '250T' : '65T'})
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>
                Limit ({reportType === 'monthly' ? '350T' : '90T'})
              </Text>
            </View>
          </View>
        </View>

        {/* 3. ACTIONABLE INSIGHTS */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Actionable Insights</Text>
          </View>

          <View style={styles.insightList}>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.insightText}>Review HVAC in SF Facility</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.insightText}>Switch Fleet to EV in Villanueva Ave</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.insightText}>Offset 50 Tons</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111'
  },

  /* Toggle Buttons */
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },

  /* Date Card */
  dateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    color: '#333'
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  /* General Card Style */
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    marginBottom: 15
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333'
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  /* Summary Card Internals */
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  co2Badge: {
    position: 'absolute',
    bottom: 12
  },
  co2Text: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  statsContainer: {
    flex: 1
  },
  bigNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  unitText: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 6,
    fontWeight: '600'
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  trendText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '600'
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10
  },
  locationList: {
    marginTop: 5
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  locName: {
    fontSize: 14,
    color: '#555'
  },
  locValue: {
    fontSize: 14,
    fontWeight: '700'
  },

  /* Chart Card Internals */
  chartContainer: {
    alignItems: 'center',
    overflow: 'hidden'
  },
  targetLineContainer: {
    position: 'absolute',
    top: 60,
    width: '100%',
    alignItems: 'center'
  },
  dashedLine: {
    width: '90%',
    height: 1,
    borderWidth: 1,
    borderColor: '#FF9800',
    borderStyle: 'dashed',
    borderRadius: 1
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 15
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  legendDot: {
    width: 10,
    height: 2,
    marginRight: 5
  },
  legendText: {
    fontSize: 12,
    color: '#555'
  },

  /* Actionable Insights */
  insightList: {
    marginTop: 5
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 10
  },
  bulletPoint: {
    fontSize: 18,
    marginRight: 8,
    color: '#555',
    lineHeight: 20
  },
  insightText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
    lineHeight: 20
  },
});