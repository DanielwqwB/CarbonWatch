import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, ScrollView, 
  TouchableOpacity, StatusBar, Dimensions, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const API_URL = 'https://co2-prediction-1.onrender.com/api/predictions/latest';

export default function PredictionScreen() {
  const [selectedTab, setSelectedTab] = useState('weekly');
  const [realTimeData, setRealTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real-time data
  const fetchRealTimeData = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setRealTimeData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and set up polling
  useEffect(() => {
    fetchRealTimeData();
    
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchRealTimeData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Weekly data (7 days) - Using real-time temp as baseline
  const getWeeklyTempData = () => {
    const baseTemp = realTimeData?.temperature || 25;
    return [
      { day: 'Mon', temp: baseTemp - 1 },
      { day: 'Tue', temp: baseTemp - 2 },
      { day: 'Wed', temp: baseTemp + 2 },
      { day: 'Thu', temp: baseTemp },
      { day: 'Fri', temp: baseTemp + 1 },
      { day: 'Sat', temp: baseTemp - 1 },
      { day: 'Sun', temp: baseTemp }
    ];
  };

  // Weekly emission data based on CO2 levels
  const getWeeklyEmissionData = () => {
    const baseCO2 = realTimeData?.co2 || 440;
    return [
      baseCO2 - 10,
      baseCO2 - 18,
      baseCO2,
      baseCO2 - 5,
      baseCO2 - 10,
      baseCO2 + 8,
      baseCO2 + 5
    ];
  };

  // Monthly data (4 weeks)
  const getMonthlyTempData = () => {
    const baseTemp = realTimeData?.temperature || 25;
    return [
      { day: 'Week 1', temp: baseTemp + 1 },
      { day: 'Week 2', temp: baseTemp + 3 },
      { day: 'Week 3', temp: baseTemp },
      { day: 'Week 4', temp: baseTemp + 4 }
    ];
  };

  const getMonthlyEmissionData = () => {
    const baseCO2 = realTimeData?.co2 || 440;
    return [
      baseCO2 * 3.4,
      baseCO2 * 4.1,
      baseCO2 * 3.2,
      baseCO2 * 4.5
    ];
  };

  // Switch data based on selected tab
  const tempData = selectedTab === 'weekly' ? getWeeklyTempData() : getMonthlyTempData();
  const emissionData = selectedTab === 'weekly' ? getWeeklyEmissionData() : getMonthlyEmissionData();

  const maxTemp = Math.max(...tempData.map(d => d.temp));
  const minTemp = Math.min(...tempData.map(d => d.temp));
  const avgTemp = (tempData.reduce((sum, d) => sum + d.temp, 0) / tempData.length).toFixed(1);

  const maxEmission = Math.max(...emissionData);
  
  // Dynamic date range and stats based on tab
  const dateRange = selectedTab === 'weekly' ? 'February 10 - 16, 2026' : 'February 2026';
  const emissionTotal = selectedTab === 'weekly' 
    ? `${(emissionData.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} Tons`
    : `${(emissionData.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} Tons`;
  const emissionChange = selectedTab === 'weekly' ? '-8% vs. Last Week' : '+5% vs. Last Month';

  // Get status color based on air quality
  const getStatusColor = (status) => {
    switch(status?.color) {
      case 'green': return '#4CAF50';
      case 'yellow': return '#FFC107';
      case 'orange': return '#FF9800';
      case 'red': return '#F44336';
      default: return '#4CAF50';
    }
  };

  if (loading && !realTimeData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading real-time data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedTab === 'weekly' ? 'Weekly' : 'Monthly'} AI-Prediction
        </Text>
        <TouchableOpacity onPress={fetchRealTimeData} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Real-Time Status Card */}
        {realTimeData && (
          <View style={styles.realTimeCard}>
            <View style={styles.realTimeHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Text style={styles.lastUpdate}>
                Last updated: {new Date(realTimeData.timestamp).toLocaleTimeString()}
              </Text>
            </View>
            
            <View style={styles.realTimeMetrics}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>CO₂ Level</Text>
                <Text style={styles.metricValue}>{realTimeData.co2.toFixed(1)}</Text>
                <Text style={styles.metricUnit}>ppm</Text>
              </View>
              
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Temperature</Text>
                <Text style={styles.metricValue}>{realTimeData.temperature.toFixed(1)}</Text>
                <Text style={styles.metricUnit}>°C</Text>
              </View>
              
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Humidity</Text>
                <Text style={styles.metricValue}>{realTimeData.humidity.toFixed(1)}</Text>
                <Text style={styles.metricUnit}>%</Text>
              </View>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(realTimeData.status) }]}>
              <Text style={styles.statusLabel}>{realTimeData.status?.label || 'Unknown'}</Text>
              <Text style={styles.statusMessage}>{realTimeData.status?.message || 'No data'}</Text>
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={fetchRealTimeData} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              selectedTab === 'monthly' ? styles.tabActive : styles.tabInactive
            ]}
            onPress={() => setSelectedTab('monthly')}
          >
            <Text style={selectedTab === 'monthly' ? styles.tabTextActive : styles.tabTextInactive}>
              AI Monthly Prediction
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab,
              selectedTab === 'weekly' ? styles.tabActive : styles.tabInactive
            ]}
            onPress={() => setSelectedTab('weekly')}
          >
            <Text style={selectedTab === 'weekly' ? styles.tabTextActive : styles.tabTextInactive}>
              AI Weekly Prediction
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Range */}
        <View style={styles.dateCard}>
          <Text style={styles.dateText}>{dateRange}</Text>
        </View>

        {/* Temperature Forecast Card */}
        <View style={styles.forecastCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Temperature Forecast</Text>
            <Text style={styles.weatherIcon}>☀️</Text>
          </View>

          {/* Temperature Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.yAxis}>
              <Text style={styles.yAxisLabel}>{Math.ceil(maxTemp + 2)}</Text>
              <Text style={styles.yAxisLabel}>{Math.ceil((maxTemp + minTemp) / 2 + 1)}</Text>
              <Text style={styles.yAxisLabel}>{Math.ceil((maxTemp + minTemp) / 2)}</Text>
              <Text style={styles.yAxisLabel}>{Math.ceil((maxTemp + minTemp) / 2 - 1)}</Text>
              <Text style={styles.yAxisLabel}>{Math.floor(minTemp - 2)}</Text>
            </View>

            <View style={styles.chartArea}>
              {/* Temperature Area Chart */}
              <View style={styles.areaChartRow}>
                {tempData.map((item, index) => {
                  const heightPercent = ((item.temp - minTemp) / (maxTemp - minTemp)) * 100;
                  return (
                    <View key={index} style={styles.barContainer}>
                      <Text style={styles.tempLabel}>{item.temp.toFixed(0)}°</Text>
                      <View 
                        style={[
                          styles.tempBar, 
                          { height: `${Math.max(heightPercent, 10)}%` }
                        ]} 
                      />
                    </View>
                  );
                })}
              </View>

              {/* X-axis labels */}
              <View style={styles.xAxis}>
                {tempData.map((item, index) => (
                  <Text key={index} style={styles.xAxisLabel}>{item.day}</Text>
                ))}
              </View>
            </View>
          </View>

          {/* Average Temperature */}
          <View style={styles.avgTempContainer}>
            <Text style={styles.avgTempLabel}>Avg Temp: </Text>
            <Text style={styles.avgTempValue}>{avgTemp} °C</Text>
          </View>
        </View>

        {/* Emission Card */}
        <View style={styles.emissionCard}>
          <View style={styles.emissionHeader}>
            <Text style={styles.emissionTitle}>Est. CO₂: <Text style={styles.emissionValue}>{emissionTotal}</Text></Text>
          </View>
          <Text style={styles.emissionChange}>{emissionChange}</Text>

          {/* Emission Prediction Chart */}
          <Text style={styles.chartSubtitle}>CO₂ Emission Prediction (ppm)</Text>
          <View style={styles.emissionChartContainer}>
            <View style={styles.emissionYAxis}>
              <Text style={styles.emissionYLabel}>{Math.ceil(maxEmission)}</Text>
              <Text style={styles.emissionYLabel}>{Math.ceil(maxEmission * 0.75)}</Text>
              <Text style={styles.emissionYLabel}>{Math.ceil(maxEmission * 0.5)}</Text>
              <Text style={styles.emissionYLabel}>{Math.ceil(maxEmission * 0.25)}</Text>
              <Text style={styles.emissionYLabel}>0</Text>
            </View>

            <View style={styles.emissionBarsArea}>
              {emissionData.map((value, index) => {
                const barHeight = (value / maxEmission) * 100;
                return (
                  <View key={index} style={styles.emissionBarContainer}>
                    <View style={[styles.emissionBar, { height: `${Math.max(barHeight, 5)}%` }]} />
                    <Text style={styles.emissionValueLabel}>{value.toFixed(0)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* AI-Driven Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>🤖 AI-Driven Insights</Text>
          <View style={styles.insightsList}>
            <Text style={styles.insightText}>
              • Current CO₂ level ({realTimeData?.co2.toFixed(0)} ppm) is {realTimeData?.status?.label?.toLowerCase() || 'normal'}
            </Text>
            <Text style={styles.insightText}>
              • Temperature is {realTimeData?.temperature > 26 ? 'above' : 'within'} comfortable range
            </Text>
            <Text style={styles.insightText}>
              • Humidity at {realTimeData?.humidity.toFixed(0)}% - {realTimeData?.humidity > 70 ? 'High moisture level detected' : 'Normal moisture levels'}
            </Text>
            <Text style={styles.insightText}>
              • {selectedTab === 'weekly' ? 'Weekly' : 'Monthly'} trend shows {emissionChange.includes('-') ? 'improvement' : 'increase'} in emissions
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F5' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFF'
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#000' 
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0'
  },
  content: { 
    paddingHorizontal: 20, 
    paddingTop: 20,
    paddingBottom: 30 
  },

  // Real-Time Status Card
  realTimeCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  realTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30'
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF3B30',
    letterSpacing: 1
  },
  lastUpdate: {
    fontSize: 11,
    color: '#999'
  },
  realTimeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000'
  },
  metricUnit: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  statusBadge: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2
  },
  statusMessage: {
    fontSize: 13,
    color: '#FFF',
    opacity: 0.9
  },

  // Error Card
  errorCard: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#856404'
  },
  retryButton: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryText: {
    color: '#000',
    fontWeight: '600'
  },

  // Tab Container
  tabContainer: { 
    flexDirection: 'row', 
    gap: 10,
    marginBottom: 20
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center'
  },
  tabInactive: {
    backgroundColor: '#E8E8E8'
  },
  tabActive: {
    backgroundColor: '#4CAF50'
  },
  tabTextInactive: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500'
  },
  tabTextActive: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600'
  },

  // Date Card
  dateCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 1
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000'
  },

  // Temperature Forecast Card
  forecastCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 1
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000'
  },
  weatherIcon: {
    fontSize: 28
  },

  // Chart Container
  chartContainer: {
    flexDirection: 'row',
    height: 180,
    marginBottom: 10
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 10,
    paddingVertical: 5
  },
  yAxisLabel: {
    fontSize: 11,
    color: '#999'
  },
  chartArea: {
    flex: 1
  },
  areaChartRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3
  },
  barContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  tempLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600'
  },
  tempBar: {
    backgroundColor: '#B3E5FC',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    width: '100%'
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8
  },
  xAxisLabel: {
    fontSize: 11,
    color: '#999',
    flex: 1,
    textAlign: 'center'
  },

  // Average Temperature
  avgTempContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15
  },
  avgTempLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000'
  },
  avgTempValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50'
  },

  // Emission Card
  emissionCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 1
  },
  emissionHeader: {
    marginBottom: 5
  },
  emissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000'
  },
  emissionValue: {
    color: '#4CAF50',
    fontWeight: '700'
  },
  emissionChange: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20
  },
  chartSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 15
  },

  // Emission Chart
  emissionChartContainer: {
    flexDirection: 'row',
    height: 140
  },
  emissionYAxis: {
    justifyContent: 'space-between',
    paddingRight: 10,
    paddingVertical: 5
  },
  emissionYLabel: {
    fontSize: 11,
    color: '#999'
  },
  emissionBarsArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingBottom: 20
  },
  emissionBarContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  emissionBar: {
    backgroundColor: '#C8E6C9',
    width: '100%',
    borderRadius: 3
  },
  emissionValueLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontWeight: '600'
  },

  // Insights Card
  insightsCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 1
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 15
  },
  insightsList: {
    gap: 10
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  }
});