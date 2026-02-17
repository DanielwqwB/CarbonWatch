import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Platform,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { 
  ArrowLeft, 
  Settings, 
  ChevronDown, 
  Thermometer, 
  CloudFog, 
  ClipboardList, 
  Users, 
  Calendar,
  TrendingUp,
  TrendingDown
} from 'lucide-react-native';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState('January 2026');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://bytetech-final1.onrender.com/dashboard');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getColorForRank = (rank) => {
    const colors = ['#FF5C4D', '#FF7A6E', '#FF9890', '#FFB6B1', '#FFC5C0'];
    return colors[rank - 1] || '#F8F9FA';
  };

  const getProgressWidth = (emission, maxEmission) => {
    const percentage = (emission / maxEmission) * 100;
    return `${Math.min(percentage, 100)}%`;
  };

  const getMonthComparison = () => {
    if (!data?.monthlyCO2Comparison || data.monthlyCO2Comparison.length < 2) {
      return { percent: 0, isIncrease: false };
    }
    
    const currentMonth = data.monthlyCO2Comparison[data.monthlyCO2Comparison.length - 1];
    const previousMonth = data.monthlyCO2Comparison[data.monthlyCO2Comparison.length - 2];
    
    if (!previousMonth || previousMonth.total === 0) {
      return { percent: 0, isIncrease: false };
    }
    
    const percent = ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100;
    return { 
      percent: Math.abs(percent).toFixed(1), 
      isIncrease: percent > 0,
      previousMonth: previousMonth.month
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color="#FF5C4D" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>Failed to load data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const maxEmission = data.topBarangays.length > 0 
    ? Math.max(...data.topBarangays.map(b => b.total_emission))
    : 1;

  const comparison = getMonthComparison();
  const inspectionDrop = parseFloat(data.inspectionDropPercent).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBarPlaceholder} />

      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton}>
            <ArrowLeft color="#2D2D2D" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ENVI Analytics</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Settings color="#2D2D2D" size={24} />
          </TouchableOpacity>
        </View>

        {/* Date Selector */}
        <TouchableOpacity style={styles.dateSelector}>
          <Text style={styles.dateText}>{selectedDate}</Text>
          <ChevronDown color="#2D2D2D" size={20} />
        </TouchableOpacity>

        {/* Key Metrics Grid (2x2) */}
        <View style={styles.metricsGrid}>
          
          {/* Row 1 */}
          <View style={styles.row}>
            {/* Heat Stress */}
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF0EE' }]}>
                <Thermometer color="#FF5C4D" size={22} />
              </View>
              <Text style={styles.metricValue}>{data.heatStressCases}</Text>
              <Text style={styles.metricLabel}>Heat Stress Cases</Text>
            </View>

            {/* Inspection Drop */}
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#F8F9FA' }]}>
                <ClipboardList color="#2D2D2D" size={22} />
              </View>
              <Text style={styles.metricValue}>{inspectionDrop}%</Text>
              <Text style={styles.metricLabel}>Inspection Drop</Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.row}>
            {/* Emission Tons */}
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF0EE' }]}>
                <CloudFog color="#FF5C4D" size={22} />
              </View>
              <Text style={styles.metricValue}>{data.totalEmission.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Total Emission Tons</Text>
            </View>

            {/* Users */}
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#F8F9FA' }]}>
                <Users color="#2D2D2D" size={22} />
              </View>
              <Text style={styles.metricValue}>{data.totalUsers.toLocaleString()}</Text>
              <Text style={styles.metricLabel}>Users</Text>
            </View>
          </View>

        </View>

        {/* Top Barangays List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Top {data.topBarangays.length} Barangays by Carbon Emission</Text>
          
          {data.topBarangays.length > 0 ? (
            <View style={styles.listContainer}>
              {data.topBarangays.map((item, index) => {
                const rank = index + 1;
                const color = getColorForRank(rank);
                const width = getProgressWidth(item.total_emission, maxEmission);
                
                return (
                  <View key={index} style={styles.listItem}>
                    <View style={[
                      styles.rankBadge, 
                      { backgroundColor: rank <= 3 ? color : '#F8F9FA' }
                    ]}>
                      <Text style={[
                        styles.rankText,
                        { color: rank <= 3 ? '#FFFFFF' : '#2D2D2D' }
                      ]}>{rank}</Text>
                    </View>
                    
                    <View style={styles.progressContainer}>
                      <View style={styles.progressLabelRow}>
                        <Text style={styles.barangayName}>{item.barangay_name}</Text>
                        <Text style={styles.barangayValue}>{item.total_emission.toFixed(1)} Tons</Text>
                      </View>
                      <View style={styles.progressBarBackground}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { backgroundColor: color, width: width }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noDataText}>No barangay data available</Text>
          )}
        </View>

        {/* Footer Summary */}
        <View style={styles.footerContainer}>
          <View style={styles.footerHeader}>
            <Calendar color="#2D2D2D" size={20} />
            <Text style={styles.footerDate}>{selectedDate}</Text>
          </View>
          
          <View style={styles.totalRow}>
            <View style={styles.totalValueContainer}>
              <View style={[
                styles.arrowIconBox,
                { backgroundColor: comparison.isIncrease ? '#FFF0EE' : '#F0FFF4' }
              ]}>
                {comparison.isIncrease ? (
                  <TrendingUp color="#FF5C4D" size={20} strokeWidth={2.5} />
                ) : (
                  <TrendingDown color="#10B981" size={20} strokeWidth={2.5} />
                )}
              </View>
              <Text style={[
                styles.totalValueText,
                { color: comparison.isIncrease ? '#FF5C4D' : '#10B981' }
              ]}>
                {data.totalEmission.toFixed(1)}
              </Text>
            </View>
            <Text style={styles.totalLabelText}>
              Tons Total CO₂
            </Text>
          </View>

          {comparison.previousMonth && (
            <View style={styles.comparisonRow}>
              <View style={[
                styles.comparisonBadge,
                { backgroundColor: comparison.isIncrease ? '#FFF0EE' : '#F0FFF4' }
              ]}>
                <Text style={[
                  styles.comparisonText,
                  { color: comparison.isIncrease ? '#FF5C4D' : '#10B981' }
                ]}>
                  {comparison.isIncrease ? '↑' : '↓'} {comparison.percent}%
                </Text>
              </View>
              <Text style={styles.comparisonLabel}>
                vs {comparison.previousMonth}
              </Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', 
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#2D2D2D',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#FF5C4D',
    marginBottom: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#FF5C4D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  statusBarPlaceholder: {
    height: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#F8F9FA',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D2D2D',
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateSelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  metricsGrid: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: '48%', 
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 20,
  },
  listContainer: {
    gap: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressContainer: {
    flex: 1,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  barangayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  barangayValue: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  footerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  footerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerDate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  arrowIconBox: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  totalValueText: {
    fontSize: 32,
    fontWeight: '700',
  },
  totalLabelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  comparisonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default Dashboard;