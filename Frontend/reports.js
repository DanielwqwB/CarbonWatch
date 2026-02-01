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
  import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';

  const API_URL = 'https://bytetech.onrender.com/api/reports';
  const FILTER_API_URL = 'https://bytetech.onrender.com/api/filter'; 
  const screenWidth = Dimensions.get('window').width;

  // --- MOCK DATA FOR VISUALS ---
  const MONTHLY_DATA = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{ data: [220, 180, 190, 150, 180, 240, 230, 240, 200, 210, 245, 250] }]
  };

  const TEMP_LINE_DATA = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: [18, 28, 22, 32, 26, 28, 25, 30],
      color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`, // Light Blue
      strokeWidth: 2 
    }]
  };

  const PREDICTION_BAR_DATA = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [{ data: [30, 20, 40, 35, 60, 70, 40, 30, 45, 20, 50, 40] }]
  };

  export default function Reports({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [establishments, setEstablishments] = useState([]);
    
    // 'ALL' = The Main Dashboard (formerly Carbon), 'AI' = The New AI Weekly View
    const [filter, setFilter] = useState('ALL'); 
    const [selectedMonth, setSelectedMonth] = useState('December 2026');
    const [selectedWeek, setSelectedWeek] = useState('January 21 - 27, 2026');

    const [carbonStats, setCarbonStats] = useState({ red: 0, yellow: 0, green: 0 });

    useEffect(() => {
      fetchReports();
    }, []);

    const fetchReports = async () => {
      try {
        setLoading(true);
        const res = await fetch(API_URL);
        const data = await res.json();
        setEstablishments(data || []);

        // Calculate carbon stats
        const totalRed = data.filter(e => e.co2_emission > 50).reduce((sum, e) => sum + e.co2_emission, 0);
        const totalYellow = data.filter(e => e.co2_emission > 20 && e.co2_emission <= 50).reduce((sum, e) => sum + e.co2_emission, 0);
        const totalGreen = data.filter(e => e.co2_emission <= 20).reduce((sum, e) => sum + e.co2_emission, 0);
        setCarbonStats({ red: totalRed, yellow: totalYellow, green: totalGreen });

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

    // --- RENDER: ALL REPORTS (Formerly Carbon Dashboard) ---
    const renderAllReports = () => (
      <>
        {/* 1. CARBON EMISSION SUMMARY CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Carbon Emission Summary</Text>
          </View>

          <View style={styles.summaryTopRow}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="factory" size={32} color="#4CAF50" />
              <View style={styles.co2Badge}>
                <Text style={styles.co2Text}>CO₂</Text>
              </View>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={{flexDirection:'row', alignItems:'flex-end'}}>
                <Text style={styles.bigNumber}>300</Text>
                <Text style={styles.unitText}> Tons</Text>
              </View>
              <Text style={styles.subStatText}><Text style={{fontWeight:'bold', color:'#333'}}>80%</Text> of 375 Tons</Text>
              <View style={styles.trendRow}>
                <Ionicons name="caret-up" size={14} color="#D32F2F" />
                <Text style={styles.trendText}> 5% vs. Last Month</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryBottomRow}>
            <View style={styles.locationList}>
              <View style={styles.locationRow}>
                <Text style={styles.locName}>San Francisco</Text>
                <Text style={[styles.locValue, {color: '#4CAF50'}]}>66%</Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locName}>Villanueva Ave.</Text>
                <Text style={[styles.locValue, {color: '#D32F2F'}]}>19%</Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locName}>Other</Text>
                <Text style={[styles.locValue, {color: '#FF9800'}]}>15%</Text>
              </View>
            </View>
            
            <View style={styles.miniPieContainer}>
              <PieChart
                data={[
                  { name: 'SF', population: 66, color: '#4CAF50', legendFontColor: '#7F7F7F', legendFontSize: 10 },
                  { name: 'Vill', population: 19, color: '#D32F2F', legendFontColor: '#7F7F7F', legendFontSize: 10 },
                  { name: 'Other', population: 15, color: '#FF9800', legendFontColor: '#7F7F7F', legendFontSize: 10 },
                ]}
                width={100}
                height={100}
                chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="25"
                hasLegend={false}
                absolute
              />
              <View style={styles.donutHole} />
            </View>
          </View>
        </View>

        {/* 2. CITY-WIDE MONTHLY CHART */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>City-wide Monthly, CO2 Emission</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={MONTHLY_DATA}
              width={screenWidth - 60}
              height={180}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                barPercentage: 0.5,
              }}
              style={{ borderRadius: 16, marginTop: 10 }}
              showValuesOnTopOfBars={false}
              withInnerLines={false}
            />
            <View style={styles.targetLineContainer}>
              <View style={styles.dashedLine} />
            </View>
          </View>
          
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: '#FF9800'}]} /> 
              <Text style={styles.legendText}>Target (250T)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: '#4CAF50'}]} /> 
              <Text style={styles.legendText}>Limit (350T)</Text>
            </View>
          </View>
        </View>

        {/* 3. ACTIONABLE INSIGHTS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Actionable Insights</Text>
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
      </>
    );

    // --- RENDER: AI WEEKLY REPORTS (New UI) ---
    const renderAIWeeklyReport = () => (
      <>
        {/* 1. TEMPERATURE FORECAST CARD */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>Temperature Forecast</Text>
              <Ionicons name="partly-sunny" size={24} color="orange" />
          </View>
          
          <LineChart
              data={TEMP_LINE_DATA}
              width={screenWidth - 60}
              height={160}
              withDots={false}
              withInnerLines={true}
              withOuterLines={false}
              withVerticalLines={false}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(150, 150, 150, ${opacity})`,
                propsForBackgroundLines: { strokeDasharray: "" }, // solid lines
              }}
              bezier
              style={{ marginTop: 10 }}
            />
            
            <View style={styles.centerContent}>
              <Text style={styles.tempText}>
                Avg Temp: <Text style={{color:'#4CAF50'}}>29 ° C</Text>
              </Text>
            </View>
        </View>

        {/* 2. EST EMISSION & PREDICTION CARD */}
        <View style={styles.card}>
          <View style={{marginBottom: 10}}>
            <Text style={styles.estEmissionTitle}>
              Est. Emission: <Text style={{color:'#4CAF50'}}>280 Tons</Text>
            </Text>
            <Text style={styles.subStatText}>-8% vs. Last Week</Text>
          </View>

          <Text style={[styles.cardTitle, {fontSize: 14, marginTop: 5}]}>Est. Emission Prediction</Text>
          
          <BarChart
              data={PREDICTION_BAR_DATA}
              width={screenWidth - 60}
              height={120}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
                barPercentage: 0.6,
              }}
              style={{ marginTop: 10 }}
              showValuesOnTopOfBars={false}
              withInnerLines={false}
            />
        </View>

        {/* 3. AI DRIVEN INSIGHTS CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AI-Driven Insights</Text>
          <View style={styles.insightList}>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.insightText}>Monday spikes due to facility power usage</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={styles.insightText}>Switch off lights in EV in unused areas</Text>
            </View>
          </View>
        </View>
      </>
    );

    // --- MAIN SCREEN ---
    if (loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{marginTop: 10}}>Loading reports...</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>

          <Text style={styles.headerTitle}>
            {filter === 'ALL' ? 'Reporting' : 'Weekly AI-Prediction'}
          </Text>
          <TouchableOpacity>
            <Ionicons name="filter" size={22} color="#555" />
          </TouchableOpacity>
        </View>

        {/* TABS (Renamed per request) */}
        <View style={styles.tabContainer}>
          <View style={styles.pillBackground}>
            <TouchableOpacity 
              style={[styles.pillBtn, filter === 'ALL' ? styles.pillActive : null]}
              onPress={() => setFilter('ALL')}
            >
              <Text style={[styles.pillText, filter === 'ALL' ? styles.pillTextActive : null]}>All Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.pillBtn, filter === 'AI' ? styles.pillActive : null]}
              onPress={() => setFilter('AI')}
            >
              <Text style={[styles.pillText, filter === 'AI' ? styles.pillTextActive : null]}>AI Weekly Prediction</Text>
            </TouchableOpacity>
          </View>
          
        </View>

        <ScrollView 
          contentContainerStyle={{paddingBottom: 40}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* DATE SELECTOR (Changes based on Tab) */}
          <View style={styles.dateCard}>
            {filter === 'ALL' ? (
              // Monthly Date
              <View style={styles.rowCenter}>
                <Ionicons name="calendar-outline" size={22} color="#4CAF50" />
                <Text style={styles.dateText}>{selectedMonth}</Text>
              </View>
            ) : (
              // Weekly Date Range
              <View style={styles.rowCenter}>
                <Text style={[styles.dateText, {marginLeft: 0, textAlign:'center', flex:1}]}>{selectedWeek}</Text>
              </View>
            )}
            {filter === 'ALL' && <Ionicons name="chevron-down" size={20} color="#777" />}
          </View>

          {filter === 'ALL' ? renderAllReports() : renderAIWeeklyReport()}
        </ScrollView>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f2f4f7' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#111' },

    /* Tabs */
    tabContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    pillBackground: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: '#f0f0f0',
      borderRadius: 8,
      padding: 2,
    },
    pillBtn: {
      flex: 1,
      paddingVertical: 6,
      alignItems: 'center',
      borderRadius: 6,
    },
    pillActive: {
      backgroundColor: '#4CAF50',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    },
    pillText: { fontSize: 13, fontWeight: '600', color: '#777' },
    pillTextActive: { color: '#fff' },

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
    dateText: { fontSize: 16, fontWeight: '600', marginLeft: 10, color: '#333' },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },

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
    cardHeaderRow: { marginBottom: 15 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    /* Summary Card Internals */
    summaryTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    iconCircle: {
      width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: '#4CAF50',
      justifyContent: 'center', alignItems: 'center', marginRight: 20,
    },
    co2Badge: { position: 'absolute', bottom: 12 },
    co2Text: { fontSize: 8, fontWeight: 'bold', color: '#4CAF50' },
    
    statsContainer: { flex: 1 },
    bigNumber: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50' },
    unitText: { fontSize: 14, color: '#4CAF50', marginBottom: 6, fontWeight: '600' },
    subStatText: { fontSize: 13, color: '#777', marginBottom: 4 },
    trendRow: { flexDirection: 'row', alignItems: 'center' },
    trendText: { color: '#D32F2F', fontSize: 12, fontWeight: '600' },

    divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },

    summaryBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    locationList: { flex: 1 },
    locationRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    locName: { fontSize: 14, color: '#555' },
    locValue: { fontSize: 14, fontWeight: '700' },
    
    miniPieContainer: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
    donutHole: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff' },

    /* Chart Card Internals */
    chartContainer: { alignItems: 'center', overflow: 'hidden' },
    targetLineContainer: { position: 'absolute', top: 60, width: '100%', alignItems: 'center' },
    dashedLine: { width: '90%', height: 1, borderWidth: 1, borderColor: '#FF9800', borderStyle: 'dashed', borderRadius: 1 },
    chartLegend: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 15 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 10, height: 2, marginRight: 5 },
    legendText: { fontSize: 12, color: '#555' },

    /* AI WEEKLY SPECIFIC STYLES */
    centerContent: { alignItems: 'center', marginTop: 10 },
    tempText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    estEmissionTitle: { fontSize: 18, fontWeight: '700', color: '#333' },

    /* Actionable Insights */
    insightList: { marginTop: 5 },
    bulletRow: { flexDirection: 'row', marginBottom: 8, paddingRight: 10 },
    bulletPoint: { fontSize: 18, marginRight: 8, color: '#555', lineHeight: 20 },
    insightText: { fontSize: 14, color: '#444', flex: 1, lineHeight: 20 },
  });