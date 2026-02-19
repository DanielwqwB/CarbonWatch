import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, ScrollView, 
  TouchableOpacity, StatusBar, Dimensions, ActivityIndicator
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const API_URL = 'https://ai-prediction-jwnp.onrender.com/api/predictions/latest';

export default function PredictionScreen() {
  const [selectedTab, setSelectedTab] = useState('weekly');
  const [realTimeData, setRealTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    fetchRealTimeData();
    const interval = setInterval(fetchRealTimeData, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const tempData = selectedTab === 'weekly' ? getWeeklyTempData() : getMonthlyTempData();
  const emissionData = selectedTab === 'weekly' ? getWeeklyEmissionData() : getMonthlyEmissionData();

  const maxTemp = Math.max(...tempData.map(d => d.temp));
  const minTemp = Math.min(...tempData.map(d => d.temp));
  const avgTemp = (tempData.reduce((sum, d) => sum + d.temp, 0) / tempData.length).toFixed(1);

  const maxEmission = Math.max(...emissionData);
  
  const dateRange = selectedTab === 'weekly' ? 'February 10 - 16, 2026' : 'February 2026';
  const emissionTotal = selectedTab === 'weekly' 
    ? `${(emissionData.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} Tons`
    : `${(emissionData.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} Tons`;
  const emissionChange = selectedTab === 'weekly' ? '-8% vs. Last Week' : '+5% vs. Last Month';

  const getStatusColor = (status) => {
    switch(status?.color) {
      case 'green': return '#10B981';
      case 'yellow': return '#FBBF24';
      case 'orange': return '#F59E0B';
      case 'red': return '#FF5C4D';
      default: return '#10B981';
    }
  };

  if (loading && !realTimeData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5C4D" />
          <Text style={styles.loadingText}>Loading real-time data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedTab === 'weekly' ? 'Weekly' : 'Monthly'} AI-Prediction
        </Text>
        <TouchableOpacity onPress={fetchRealTimeData} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={20} color="#2D2D2D" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {realTimeData && (
          <View style={styles.realTimeCard}>
            <View style={styles.realTimeHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
              <Text style={styles.lastUpdate}>
                {new Date(realTimeData.timestamp).toLocaleTimeString()}
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

        <View style={styles.dateCard}>
          <Text style={styles.dateText}>{dateRange}</Text>
        </View>

        <View style={styles.forecastCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Temperature Forecast</Text>
            <Text style={styles.weatherIcon}>☀️</Text>
          </View>

          <View style={styles.chartContainer}>
            <View style={styles.yAxis}>
              <Text style={styles.yAxisLabel}>{Math.ceil(maxTemp + 2)}</Text>
              <Text style={styles.yAxisLabel}>{Math.ceil((maxTemp + minTemp) / 2 + 1)}</Text>
              <Text style={styles.yAxisLabel}>{Math.ceil((maxTemp + minTemp) / 2)}</Text>
              <Text style={styles.yAxisLabel}>{Math.ceil((maxTemp + minTemp) / 2 - 1)}</Text>
              <Text style={styles.yAxisLabel}>{Math.floor(minTemp - 2)}</Text>
            </View>

            <View style={styles.chartArea}>
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

              <View style={styles.xAxis}>
                {tempData.map((item, index) => (
                  <Text key={index} style={styles.xAxisLabel}>{item.day}</Text>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.avgTempContainer}>
            <Text style={styles.avgTempLabel}>Avg Temp: </Text>
            <Text style={styles.avgTempValue}>{avgTemp} °C</Text>
          </View>
        </View>

        <View style={styles.emissionCard}>
          <View style={styles.emissionHeader}>
            <Text style={styles.emissionTitle}>Est. CO₂: <Text style={styles.emissionValue}>{emissionTotal}</Text></Text>
          </View>
          <Text style={styles.emissionChange}>{emissionChange}</Text>

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
              • Humidity at {realTimeData?.humidity.toFixed(0)}% - {realTimeData?.humidity > 70 ? 'High moisture detected' : 'Normal levels'}
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
    backgroundColor: '#F8F9FA' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#2D2D2D',
    fontWeight: '500'
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF'
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#2D2D2D' 
  },
  refreshButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F8F9FA'
  },
  content: { 
    paddingHorizontal: 20, 
    paddingTop: 20,
    paddingBottom: 30 
  },
  realTimeCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  realTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5C4D'
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF5C4D',
    letterSpacing: 1
  },
  lastUpdate: {
    fontSize: 11,
    color: '#9CA3AF'
  },
  realTimeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2D2D2D'
  },
  metricUnit: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2
  },
  statusBadge: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2
  },
  statusMessage: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.95
  },
  errorCard: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E'
  },
  retryButton: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryText: {
    color: '#78350F',
    fontWeight: '600'
  },
  tabContainer: { 
    flexDirection: 'row', 
    gap: 12,
    marginBottom: 20
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  tabInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB'
  },
  tabActive: {
    backgroundColor: '#FF5C4D'
  },
  tabTextInactive: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600'
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D'
  },
  forecastCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D2D2D'
  },
  weatherIcon: {
    fontSize: 28
  },
  chartContainer: {
    flexDirection: 'row',
    height: 180,
    marginBottom: 12
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 10,
    paddingVertical: 5
  },
  yAxisLabel: {
    fontSize: 11,
    color: '#9CA3AF'
  },
  chartArea: {
    flex: 1
  },
  areaChartRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4
  },
  barContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center'
  },
  tempLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600'
  },
  tempBar: {
    backgroundColor: '#FF9890',
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
    color: '#9CA3AF',
    flex: 1,
    textAlign: 'center'
  },
  avgTempContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16
  },
  avgTempLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D'
  },
  avgTempValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF5C4D'
  },
  emissionCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  emissionHeader: {
    marginBottom: 4
  },
  emissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D'
  },
  emissionValue: {
    color: '#FF5C4D',
    fontWeight: '700'
  },
  emissionChange: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20
  },
  chartSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 16
  },
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
    color: '#9CA3AF'
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
    backgroundColor: '#FFB6B1',
    width: '100%',
    borderRadius: 4
  },
  emissionValueLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600'
  },
  insightsCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 16
  },
  insightsList: {
    gap: 12
  },
  insightText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20
  }
});