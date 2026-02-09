import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, ScrollView, 
  TouchableOpacity, StatusBar, Dimensions
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function PredictionScreen() {
  const [selectedTab, setSelectedTab] = useState('weekly');

  // Weekly data (7 days)
  const weeklyTempData = [
    { day: 'Mon', temp: 28 },
    { day: 'Tue', temp: 27 },
    { day: 'Wed', temp: 31 },
    { day: 'Thu', temp: 29 },
    { day: 'Fri', temp: 30 },
    { day: 'Sat', temp: 28 },
    { day: 'Sun', temp: 30 }
  ];
  const weeklyEmissionData = [30, 22, 40, 35, 30, 48, 45];

  // Monthly data (4 weeks)
  const monthlyTempData = [
    { day: 'Week 1', temp: 29 },
    { day: 'Week 2', temp: 31 },
    { day: 'Week 3', temp: 28 },
    { day: 'Week 4', temp: 32 }
  ];
  const monthlyEmissionData = [150, 180, 140, 200];

  // Switch data based on selected tab
  const tempData = selectedTab === 'weekly' ? weeklyTempData : monthlyTempData;
  const emissionData = selectedTab === 'weekly' ? weeklyEmissionData : monthlyEmissionData;

  const maxTemp = Math.max(...tempData.map(d => d.temp));
  const minTemp = Math.min(...tempData.map(d => d.temp));
  const avgTemp = (tempData.reduce((sum, d) => sum + d.temp, 0) / tempData.length).toFixed(0);

  const maxEmission = Math.max(...emissionData);
  
  // Dynamic date range and stats based on tab
  const dateRange = selectedTab === 'weekly' ? 'January 21 - 27, 2026' : 'January 2026';
  const emissionTotal = selectedTab === 'weekly' ? '280 Tons' : '670 Tons';
  const emissionChange = selectedTab === 'weekly' ? '-8% vs. Last Week' : '+5% vs. Last Month';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedTab === 'weekly' ? 'Weekly' : 'Monthly'} AI-Prediction
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
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
              <Text style={styles.yAxisLabel}>32</Text>
              <Text style={styles.yAxisLabel}>29</Text>
              <Text style={styles.yAxisLabel}>25</Text>
              <Text style={styles.yAxisLabel}>22</Text>
              <Text style={styles.yAxisLabel}>18</Text>
            </View>

            <View style={styles.chartArea}>
              {/* Temperature Area Chart */}
              <View style={styles.areaChartRow}>
                {tempData.map((item, index) => {
                  const heightPercent = ((item.temp - minTemp) / (maxTemp - minTemp)) * 100;
                  return (
                    <View key={index} style={styles.barContainer}>
                      <View 
                        style={[
                          styles.tempBar, 
                          { height: `${heightPercent}%` }
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
            <Text style={styles.emissionTitle}>Est. Emission: <Text style={styles.emissionValue}>{emissionTotal}</Text></Text>
          </View>
          <Text style={styles.emissionChange}>{emissionChange}</Text>

          {/* Emission Prediction Chart */}
          <Text style={styles.chartSubtitle}>Est. Emission Prediction</Text>
          <View style={styles.emissionChartContainer}>
            <View style={styles.emissionYAxis}>
              <Text style={styles.emissionYLabel}>70</Text>
              <Text style={styles.emissionYLabel}>58</Text>
              <Text style={styles.emissionYLabel}>45</Text>
              <Text style={styles.emissionYLabel}>33</Text>
              <Text style={styles.emissionYLabel}>20</Text>
            </View>

            <View style={styles.emissionBarsArea}>
              {emissionData.map((value, index) => {
                const barHeight = (value / maxEmission) * 100;
                return (
                  <View key={index} style={styles.emissionBarContainer}>
                    <View style={[styles.emissionBar, { height: `${barHeight}%` }]} />
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* AI-Driven Insights */}
        <View style={styles.insightsCard}>
          <Text style={styles.insightsTitle}>AI-Driven Insights</Text>
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
  menuIcon: { 
    padding: 5
  },
  content: { 
    paddingHorizontal: 20, 
    paddingTop: 20,
    paddingBottom: 30 
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
    height: 150,
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
    justifyContent: 'flex-end'
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
    height: 120
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
    paddingBottom: 5
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
    color: '#000'
  }
});