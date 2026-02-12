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
  MoveUp,
  MoveDown
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
      // Replace with your actual API endpoint
      const response = await fetch('https://bytetech-final1.onrender.com/dashboard');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback to mock data for development
      setData({
        heatStressCases: 0,
        totalEmission: 450.5,
        inspectionDropPercent: "0.0000",
        totalUsers: 1,
        topBarangays: [
          { barangay_name: "Abella", total_emission: 450.5 }
        ],
        monthlyCO2Comparison: [
          { month_number: 2, month: "Feb", total: 450.5 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to get color based on rank
  const getColorForRank = (rank) => {
    const colors = ['#ef4444', '#f97316', '#fdba74', '#facc15', '#4ade80'];
    return colors[rank - 1] || '#94a3b8';
  };

  // Function to calculate progress bar width
  const getProgressWidth = (emission, maxEmission) => {
    const percentage = (emission / maxEmission) * 100;
    return `${Math.min(percentage, 100)}%`;
  };

  // Calculate comparison with previous month
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
          <ActivityIndicator size="large" color="#3b82f6" />
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
            <ArrowLeft color="#4b5563" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ENVI Analytics</Text>
          <TouchableOpacity style={[styles.iconButton, styles.shadow]}>
            <Settings color="#6b7280" size={24} />
          </TouchableOpacity>
        </View>

        {/* Date Selector */}
        <TouchableOpacity style={styles.dateSelector}>
          <Text style={styles.dateText}>{selectedDate}</Text>
          <ChevronDown color="#6b7280" size={20} />
        </TouchableOpacity>

        {/* Key Metrics Grid (2x2) */}
        <View style={{ marginBottom: 24 }}>
          
          {/* Row 1 */}
          <View style={styles.row}>
            {/* Heat Stress */}
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
                <Thermometer color="#ef4444" size={20} />
              </View>
              <View>
                <Text style={styles.metricValue}>{data.heatStressCases}</Text>
                <Text style={styles.metricLabel}>Heat Stress Cases</Text>
              </View>
            </View>

            {/* Inspection Drop */}
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                <ClipboardList color="#1e40af" size={20} />
              </View>
              <View>
                <Text style={styles.metricValue}>{inspectionDrop}%</Text>
                <Text style={styles.metricLabel}>Inspection Drop</Text>
              </View>
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.row}>
            {/* Emission Tons */}
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#ffedd5' }]}>
                <CloudFog color="#fb923c" size={20} />
              </View>
              <View>
                <Text style={styles.metricValue}>{data.totalEmission.toFixed(1)}</Text>
                <Text style={styles.metricLabel}>Total Emission Tons</Text>
              </View>
            </View>

            {/* Users */}
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
                <Users color="#16a34a" size={20} />
              </View>
              <View>
                <Text style={styles.metricValue}>{data.totalUsers.toLocaleString()}</Text>
                <Text style={styles.metricLabel}>Users</Text>
              </View>
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
                      { backgroundColor: rank <= 3 ? color : 'transparent' }
                    ]}>
                      <Text style={[
                        styles.rankText,
                        { color: rank > 3 ? '#4b5563' : '#fff' }
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
            <Calendar color="#6b7280" size={20} />
            <Text style={styles.footerDate}>{selectedDate}</Text>
          </View>
          
          <View style={styles.totalRow}>
            <View style={styles.totalValueContainer}>
              <View style={[
                styles.arrowIconBox,
                { backgroundColor: comparison.isIncrease ? '#fee2e2' : '#dcfce7' }
              ]}>
                {comparison.isIncrease ? (
                  <MoveUp color="#ef4444" size={24} strokeWidth={3} />
                ) : (
                  <MoveDown color="#22c55e" size={24} strokeWidth={3} />
                )}
              </View>
              <Text style={[
                styles.totalValueText,
                { color: comparison.isIncrease ? '#ef4444' : '#22c55e' }
              ]}>
                {data.totalEmission.toFixed(1)}
              </Text>
            </View>
            <Text style={[
              styles.totalLabelText,
              { color: comparison.isIncrease ? '#ef4444' : '#22c55e' }
            ]}>
              Tons Total CO2
            </Text>
          </View>

          {comparison.previousMonth && (
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonBadge}>
                <Text style={[
                  styles.comparisonText,
                  { color: comparison.isIncrease ? '#dc2626' : '#16a34a' }
                ]}>
                  {comparison.isIncrease ? '↑' : '↓'} {comparison.percent}%
                </Text>
              </View>
              <Text style={styles.comparisonLabel}>
                Compared to {comparison.previousMonth}
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
    backgroundColor: '#f3f4f6', 
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
  statusBarPlaceholder: {
    height: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#f3f4f6',
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  iconButton: {
    padding: 8,
    borderRadius: 50,
  },
  shadow: {
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
  },
  dateSelector: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: '48%', 
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    height: 140,
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  rankText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressContainer: {
    flex: 1,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  barangayName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4b5563',
  },
  barangayValue: {
    fontSize: 12,
    color: '#6b7280',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  footerContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  footerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  footerDate: {
    fontSize: 18,
    fontWeight: '300',
    color: '#6b7280',
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowIconBox: {
    padding: 4,
    borderRadius: 4,
    marginRight: 4,
  },
  totalValueText: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  totalLabelText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 4,
    marginLeft: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comparisonBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default Dashboard;