import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Platform,
  StatusBar
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
  MoveUp
} from 'lucide-react-native';

const Dashboard = () => {
  const barangayData = [
    { rank: 1, name: 'San Francisco', value: 265, color: '#ef4444', width: '90%' },
    { rank: 2, name: 'Villanueva Ave.', value: 255, color: '#f97316', width: '85%' },
    { rank: 3, name: 'Dayangdang', value: 250, color: '#fdba74', width: '83%' },
    { rank: 4, name: 'Tabuco', value: 195, color: '#facc15', width: '65%' },
    { rank: 5, name: 'Villanueva Ave.', value: 190, color: '#4ade80', width: '60%' },
  ];

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
          <Text style={styles.dateText}>January 2026</Text>
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
                <Text style={styles.metricValue}>670</Text>
                <Text style={styles.metricLabel}>Heat Stress Cases</Text>
              </View>
            </View>

            {/* Inspection Drop */}
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                <ClipboardList color="#1e40af" size={20} />
              </View>
              <View>
                <Text style={styles.metricValue}>45%</Text>
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
                <Text style={styles.metricValue}>120</Text>
                <Text style={styles.metricLabel}>Emission Tons (Top 20%)</Text>
              </View>
            </View>

            {/* Users */}
            <View style={styles.card}>
              <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
                <Users color="#16a34a" size={20} />
              </View>
              <View>
                <Text style={styles.metricValue}>8932</Text>
                <Text style={styles.metricLabel}>Users</Text>
              </View>
            </View>
          </View>

        </View>

        {/* Top Barangays List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Top 5 Barangays by Carbon Emission</Text>
          <View style={styles.listContainer}>
            {barangayData.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <View style={[
                  styles.rankBadge, 
                  { backgroundColor: item.rank <= 3 ? item.color : 'transparent' }
                ]}>
                  <Text style={[
                    styles.rankText,
                    { color: item.rank > 3 ? '#4b5563' : '#fff' }
                  ]}>{item.rank}</Text>
                </View>
                
                <View style={styles.progressContainer}>
                   <View style={styles.progressLabelRow}>
                      <Text style={styles.barangayName}>{item.name}</Text>
                      <Text style={styles.barangayValue}>{item.value} Tons</Text>
                   </View>
                   <View style={styles.progressBarBackground}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { backgroundColor: item.color, width: item.width }
                        ]} 
                      />
                   </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Footer Summary */}
        <View style={styles.footerContainer}>
          <View style={styles.footerHeader}>
            <Calendar color="#6b7280" size={20} />
            <Text style={styles.footerDate}>January 2026</Text>
          </View>
          
          <View style={styles.totalRow}>
             <View style={styles.totalValueContainer}>
                <View style={styles.arrowIconBox}>
                  <MoveUp color="#22c55e" size={24} strokeWidth={3} />
                </View>
                <Text style={styles.totalValueText}>350</Text>
             </View>
             <Text style={styles.totalLabelText}>Tons Total CO2</Text>
          </View>

          <View style={styles.comparisonRow}>
             <View style={styles.comparisonBadge}>
               <Text style={styles.comparisonText}>→ 1%</Text>
             </View>
             <Text style={styles.comparisonLabel}>Compared to December 2025</Text>
          </View>
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
    backgroundColor: '#dcfce7',
    padding: 4,
    borderRadius: 4,
    marginRight: 4,
  },
  totalValueText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  totalLabelText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#22c55e',
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
    color: '#16a34a',
    fontSize: 12,
    fontWeight: 'bold',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default Dashboard;
