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

const BASE_URL = 'https://bytetech-final1.onrender.com/reports';
const screenWidth = Dimensions.get('window').width;

export default function Reports({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [establishments, setEstablishments] = useState([]);
  const [barangayData, setBarangayData] = useState([]);
  const [reportType, setReportType] = useState('monthly'); // 'monthly' or 'weekly'
  const [selectedMonth, setSelectedMonth] = useState('February 2026');
  const [carbonStats, setCarbonStats] = useState({
    red: 0,
    yellow: 0,
    green: 0
  });

  useEffect(() => {
    fetchReports();
    fetchBarangayData();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [reportType]);

  const fetchBarangayData = async () => {
    try {
      const res = await fetch('https://bytetech-final1.onrender.com/barangay');
      const response = await res.json();
      
      if (response && response.data) {
        const barangaysWithEmissions = response.data.map(barangay => {
          const densityMultiplier = barangay.density === 'High' ? 1.5 : 1.0;
          const co2_emission = ((barangay.temperature_c - 25) * 2 * densityMultiplier) + 10;
          
          return {
            ...barangay,
            co2_emission: Math.max(co2_emission, 5)
          };
        });
        
        const sortedBarangays = barangaysWithEmissions
          .sort((a, b) => b.co2_emission - a.co2_emission);
        
        setBarangayData(sortedBarangays);
      }
    } catch (err) {
      console.error('Barangay API Error:', err);
      setBarangayData([]);
    }
  };

  // FIXED: Aggregation function to handle both monthly and weekly data
  const aggregateData = (rawData, type) => {
    if (!rawData || rawData.length === 0) return [];
    
    if (type === 'monthly') {
      const monthlyMap = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Initialize all 12 months with 0
      for (let i = 0; i < 12; i++) {
        monthlyMap[i] = {
          month: monthNames[i],
          month_number: i,
          co2_emission: 0,
          count: 0
        };
      }
      
      rawData.forEach(record => {
        const date = new Date(record.recorded_at);
        const monthIndex = date.getMonth();
        
        // Convert from decimals to tons (multiply by 1000)
        const emission = parseFloat(record.co2_emission) || 0;
        monthlyMap[monthIndex].co2_emission += (emission * 1000);
        monthlyMap[monthIndex].count += 1;
      });
      
      return Object.values(monthlyMap);
      
    } else {
      // FIXED: Weekly aggregation logic
      const weeklyMap = {};
      const now = new Date();
      
      // Initialize 4 weeks (Week 1 = most recent, Week 4 = oldest)
      for (let i = 0; i < 4; i++) {
        weeklyMap[i] = {
          week: `Week ${4 - i}`,
          week_number: i,
          co2_emission: 0,
          count: 0
        };
      }
      
      rawData.forEach(record => {
        const recordDate = new Date(record.recorded_at);
        const daysDiff = Math.floor((now - recordDate) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.floor(daysDiff / 7);
        
        // Map to correct week (0 = current week, 3 = 3 weeks ago)
        if (weekIndex >= 0 && weekIndex < 4) {
          const emission = parseFloat(record.co2_emission) || 0;
          weeklyMap[weekIndex].co2_emission += (emission * 1000); // Convert to tons
          weeklyMap[weekIndex].count += 1;
        }
      });
      
      // Return weeks in reverse order (Week 1 first, Week 4 last)
      return Object.values(weeklyMap).reverse();
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      // Use the correct API endpoint based on report type
      const endpoint = reportType === 'monthly' 
        ? `${BASE_URL}/monthly`
        : `${BASE_URL}/weekly`;
      
      const res = await fetch(endpoint);
      const responseData = await res.json();
      
      console.log('API Endpoint:', endpoint);
      console.log('Raw API Response:', responseData);
      
      // Extract data from the API structure
      let rawData = [];
      if (responseData && Array.isArray(responseData.sensorData)) {
        rawData = responseData.sensorData;
      } else if (Array.isArray(responseData)) {
        rawData = responseData;
      } else if (responseData && Array.isArray(responseData.data)) {
        rawData = responseData.data;
      }
      
      console.log(`${reportType} data count:`, rawData.length);
      if (rawData.length > 0) {
        console.log('Sample record:', rawData[0]);
      }
      
      // Aggregate data based on report type
      const aggregatedData = aggregateData(rawData, reportType);
      
      console.log('Aggregated Data:', aggregatedData);
      
      setEstablishments(aggregatedData);

      // Calculate carbon stats from aggregated data
      if (aggregatedData.length > 0) {
        const totalRed = aggregatedData
          .filter(e => e.co2_emission > 50)
          .reduce((sum, e) => sum + e.co2_emission, 0);
        const totalYellow = aggregatedData
          .filter(e => e.co2_emission > 20 && e.co2_emission <= 50)
          .reduce((sum, e) => sum + e.co2_emission, 0);
        const totalGreen = aggregatedData
          .filter(e => e.co2_emission <= 20)
          .reduce((sum, e) => sum + e.co2_emission, 0);

        setCarbonStats({
          red: totalRed,
          yellow: totalYellow,
          green: totalGreen
        });
      } else {
        setCarbonStats({ red: 0, yellow: 0, green: 0 });
      }

      // Update barangay data from the breakdown if available
      if (responseData && Array.isArray(responseData.breakdown)) {
        const barangaysFromBreakdown = responseData.breakdown.map(b => ({
          barangay_name: b.barangay_name,
          co2_emission: parseFloat(b.total) * 1000, // Convert to tons
          percentage: parseFloat(b.percentage)
        }));
        setBarangayData(barangaysFromBreakdown);
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
  };

  const processChartData = () => {
    if (!establishments || !Array.isArray(establishments) || establishments.length === 0) {
      return reportType === 'monthly' 
        ? { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], datasets: [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }] }
        : { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], datasets: [{ data: [0, 0, 0, 0] }] };
    }

    if (reportType === 'monthly') {
      const labels = establishments.map(e => e.month).filter(Boolean);
      const data = establishments.map(e => Math.max(0, Math.round(e.co2_emission) || 0));
      
      // Ensure we have exactly 12 data points
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const finalLabels = labels.length === 12 ? labels : monthNames;
      const paddingNeeded = Math.max(0, 12 - data.length);
      const finalData = data.length === 12 ? data : [...data, ...Array(paddingNeeded).fill(0)];
      
      return {
        labels: finalLabels,
        datasets: [{ data: finalData }]
      };
    } else {
      const labels = establishments.map(e => e.week).filter(Boolean);
      const data = establishments.map(e => Math.max(0, Math.round(e.co2_emission) || 0));
      
      // Ensure we have exactly 4 data points
      const weekNames = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const finalLabels = labels.length === 4 ? labels : weekNames;
      const paddingNeeded = Math.max(0, 4 - data.length);
      const finalData = data.length === 4 ? data : [...data, ...Array(paddingNeeded).fill(0)];
      
      return {
        labels: finalLabels,
        datasets: [{ data: finalData }]
      };
    }
  };

  const chartData = processChartData();
  
  const calculateTotalEmission = () => {
    if (!establishments || !Array.isArray(establishments) || establishments.length === 0) {
      return 0;
    }
    const total = establishments.reduce((sum, e) => sum + (e.co2_emission || 0), 0);
    return Math.round(total);
  };

  const calculateTargetInfo = () => {
    const total = calculateTotalEmission();
    const target = reportType === 'monthly' ? 375 : 100;
    const percentage = total > 0 ? Math.round((total / target) * 100) : 0;
    return `${percentage}% of ${target} Tons`;
  };

  // FIXED: Trend calculation for weekly data
  const calculateTrend = () => {
    if (!establishments || !Array.isArray(establishments) || establishments.length === 0) {
      return { value: '0%', direction: 'neutral' };
    }

    // For weekly: compare Week 1 (index 0, most recent) to Week 2 (index 1)
    // For monthly: compare most recent month to previous month
    const sortedData = [...establishments];
    
    if (reportType === 'monthly') {
      sortedData.sort((a, b) => b.month_number - a.month_number);
    }
    // For weekly, data is already in correct order (Week 1 first)
    
    if (sortedData.length < 2) {
      return { value: '0%', direction: 'neutral' };
    }

    const current = sortedData[0]?.co2_emission || 0;
    const previous = sortedData[1]?.co2_emission || 0;

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

  const getTopBarangays = () => {
    if (!barangayData || barangayData.length === 0) {
      return [
        { name: 'San Francisco', value: 66 },
        { name: 'Villanueva Ave.', value: 19 },
        { name: 'Other', value: 15 }
      ];
    }

    // Sort by co2_emission
    const sortedBarangays = [...barangayData].sort((a, b) => b.co2_emission - a.co2_emission);
    
    // Get top 2 barangays
    const top2 = sortedBarangays.slice(0, 2);
    
    // If we have percentage data from API, use it
    if (top2[0].percentage !== undefined) {
      const top1Percentage = Math.round(parseFloat(top2[0].percentage));
      const top2Percentage = Math.round(parseFloat(top2[1].percentage));
      const othersPercentage = 100 - top1Percentage - top2Percentage;
      
      return [
        { name: top2[0].barangay_name, value: top1Percentage },
        { name: top2[1].barangay_name, value: top2Percentage },
        { name: 'Other', value: othersPercentage }
      ];
    }
    
    // Otherwise calculate from emissions
    const totalEmissions = sortedBarangays.reduce((sum, b) => sum + (b.co2_emission || 0), 0);
    
    if (totalEmissions === 0) {
      return [
        { name: 'San Francisco', value: 66 },
        { name: 'Villanueva Ave.', value: 19 },
        { name: 'Other', value: 15 }
      ];
    }
    
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

        <View style={styles.dateCard}>
          <View style={styles.rowCenter}>
            <MaterialCommunityIcons name="calendar-month" size={20} color="#4CAF50" />
            <Text style={styles.dateText}>
              {reportType === 'monthly' ? selectedMonth : 'February 7 - 13, 2026'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#777" />
        </View>

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

          <View style={styles.locationList}>
            {topBarangays.map((loc, index) => (
              <View key={index} style={styles.locationRow}>
                <Text style={styles.locName}>{loc.name}</Text>
                <Text style={styles.locValue}>{loc.value}%</Text>
              </View>
            ))}
          </View>
        </View>

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

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Actionable Insights</Text>
          </View>

          <View style={styles.insightList}>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.insightText}>Review HVAC in {topBarangays[0].name} Facility</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.insightText}>Switch Fleet to EV in {topBarangays[1].name}</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.insightText}>Offset {Math.round(calculateTotalEmission() * 0.3)} Tons</Text>
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
    fontWeight: '600',
    marginLeft: 4
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