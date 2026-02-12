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
import { PieChart, BarChart } from 'react-native-chart-kit';

const API_URL = '';
const screenWidth = Dimensions.get('window').width;

// --- MOCK DATA FOR VISUALS ---
const MONTHLY_DATA = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  datasets: [{
    data: [220, 180, 190, 150, 180, 240, 230, 240, 200, 210, 245, 250]
  }]
};

const WEEKLY_DATA = {
  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
  datasets: [{
    data: [55, 62, 58, 75]
  }]
};

export default function Reports({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [establishments, setEstablishments] = useState([]);
  const [reportType, setReportType] = useState('monthly'); // 'monthly' or 'weekly'
  const [selectedMonth, setSelectedMonth] = useState('December 2026');
  const [carbonStats, setCarbonStats] = useState({
    red: 0,
    yellow: 0,
    green: 0
  });

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

      setCarbonStats({
        red: totalRed,
        yellow: totalYellow,
        green: totalGreen
      });
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

  const chartData = reportType === 'monthly' ? MONTHLY_DATA : WEEKLY_DATA;
  const totalEmission = reportType === 'monthly' ? '300 Tons' : '75 Tons';
  const targetPercentage = reportType === 'monthly' ? '80% of 375 Tons' : '75% of 100 Tons';
  const trendValue = reportType === 'monthly' ? '5% vs. Last Month' : '8% vs. Last Week';

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
                <MaterialCommunityIcons name="triangle" size={12} color="#D32F2F" />
                <Text style={styles.trendText}>{trendValue}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryBottomRow}>
            <View style={styles.locationList}>
              <View style={styles.locationRow}>
                <Text style={styles.locName}>San Francisco</Text>
                <Text style={styles.locValue}>66%</Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locName}>Villanueva Ave.</Text>
                <Text style={styles.locValue}>19%</Text>
              </View>
              <View style={styles.locationRow}>
                <Text style={styles.locName}>Other</Text>
                <Text style={styles.locValue}>15%</Text>
              </View>
            </View>

            <View style={styles.miniPieContainer}>
              <PieChart
                data={[
                  { name: 'SF', population: 66, color: '#4CAF50', legendFontColor: '#777' },
                  { name: 'VA', population: 19, color: '#FFC107', legendFontColor: '#777' },
                  { name: 'Oth', population: 15, color: '#FF5722', legendFontColor: '#777' }
                ]}
                width={60}
                height={60}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="0"
                hasLegend={false}
                absolute
              />
              <View style={styles.donutHole} />
            </View>
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
  summaryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  locationList: {
    flex: 1
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  locName: {
    fontSize: 14,
    color: '#555'
  },
  locValue: {
    fontSize: 14,
    fontWeight: '700'
  },
  miniPieContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center'
  },
  donutHole: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff'
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