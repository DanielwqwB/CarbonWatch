import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import CalendarPicker from './Calendarpicker';

const SENSOR_API      = 'https://bytetech-final1.onrender.com/sensor';
const SENSOR_DATA_API = 'https://bytetech-final1.onrender.com/sensor-data';
const screenWidth     = Dimensions.get('window').width;

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const getCarbonColor = (level) => {
  if (!level) return '#22C55E';
  switch (level.toUpperCase()) {
    case 'VERY HIGH': return '#D64545';
    case 'HIGH':      return '#E8A75D';
    case 'MODERATE':  return '#F59E0B';
    case 'LOW':       return '#3B82F6';
    default:          return '#22C55E';
  }
};

// co2_density is a raw sensor index (NOT ppm). Display it as a decimal index value.
const formatCO2Index = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? '—' : n.toFixed(4);
};

const SEVERITY_RANK = { 'VERY HIGH': 4, HIGH: 3, MODERATE: 2, LOW: 1, NORMAL: 0 };

export default function Reports() {
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [sensorList, setSensorList]         = useState([]);
  const [dataList, setDataList]             = useState([]);
  const [earliestDate, setEarliestDate]     = useState(null);
  const [reportType, setReportType]         = useState('monthly');
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selected, setSelected]             = useState(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAllData = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoading(true);

      const [sensorRes, dataRes] = await Promise.all([
        fetch(SENSOR_API),
        fetch(SENSOR_DATA_API),
      ]);

      const sensors  = await sensorRes.json();
      const dataJson = await dataRes.json();
      const records  = Array.isArray(dataJson) ? dataJson : (dataJson.data || []);

      setSensorList(Array.isArray(sensors) ? sensors : []);
      setDataList(records);

      // Seed calendar range
      const dates = records
        .map(d => d.recorded_at).filter(Boolean)
        .map(d => new Date(d)).sort((a, b) => a - b);

      if (dates.length) {
        setEarliestDate(dates[0].toISOString());
        const latest = dates[dates.length - 1];
        setSelected({ year: latest.getFullYear(), month: latest.getMonth() });
      }
    } catch (err) {
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAllData(true); }, []);

  const onRefresh = () => { setRefreshing(true); fetchAllData(false); };

  const handleReportTypeChange = (type) => {
    setReportType(type);
    if (selected) setSelected({ year: selected.year, month: selected.month });
  };

  // ── Merge: filter records to selected period, then keep latest per sensor ──
  const filtered = useMemo(() => {
    if (!sensorList.length) return [];

    const sensorMap = {};
    sensorList.forEach(s => { sensorMap[s.sensor_id] = s; });

    // Filter records to selected period
    const periodRecords = selected
      ? dataList.filter(d => {
          if (!d.recorded_at) return false;
          const dt = new Date(d.recorded_at);

          if (reportType === 'monthly') {
            return dt.getFullYear() === selected.year && dt.getMonth() === selected.month;
          } else {
            if (!selected.startDate || !selected.endDate) {
              return dt.getFullYear() === selected.year && dt.getMonth() === selected.month;
            }
            const start = new Date(selected.startDate); start.setHours(0, 0, 0, 0);
            const end   = new Date(selected.endDate);   end.setHours(23, 59, 59, 999);
            return dt >= start && dt <= end;
          }
        })
      : dataList;

    // Keep only the LATEST record per sensor
    const latestMap = {};
    periodRecords.forEach(d => {
      const existing = latestMap[d.sensor_id];
      if (!existing || new Date(d.recorded_at) > new Date(existing.recorded_at)) {
        latestMap[d.sensor_id] = d;
      }
    });

    // Join with sensor metadata
    return Object.values(latestMap).map(d => ({
      ...(sensorMap[d.sensor_id] || {}),
      ...d,
    }));
  }, [sensorList, dataList, selected, reportType]);

  const hasData = filtered.length > 0;

  // ── Derived stats ──────────────────────────────────────────────────────────
  const avgOf = (key) => {
    const valid = filtered.filter(s => s[key] != null && !isNaN(parseFloat(s[key])));
    if (!valid.length) return 0;
    return valid.reduce((s, x) => s + parseFloat(x[key]), 0) / valid.length;
  };

  // Average CO2 index (raw, not ppm)
  const avgCO2Index = (() => {
    const valid = filtered.filter(s => s.co2_density != null && !isNaN(parseFloat(s.co2_density)));
    if (!valid.length) return '—';
    return (valid.reduce((sum, x) => sum + parseFloat(x.co2_density), 0) / valid.length).toFixed(4);
  })();

  const carbonCounts = { 'VERY HIGH': 0, HIGH: 0, MODERATE: 0, LOW: 0, NORMAL: 0 };
  filtered.forEach(s => {
    const l = (s.carbon_level || 'NORMAL').toUpperCase();
    if (carbonCounts[l] !== undefined) carbonCounts[l]++;
  });

  // Sort by severity first, then co2_density as tiebreaker
  const topBarangays = [...filtered]
    .filter(s => s.carbon_level != null || s.co2_density != null)
    .sort((a, b) => {
      const aRank = SEVERITY_RANK[(a.carbon_level || 'NORMAL').toUpperCase()] ?? 0;
      const bRank = SEVERITY_RANK[(b.carbon_level || 'NORMAL').toUpperCase()] ?? 0;
      if (bRank !== aRank) return bRank - aRank;
      return (parseFloat(b.co2_density) || 0) - (parseFloat(a.co2_density) || 0);
    })
    .slice(0, 3);

  const top3 = topBarangays.map(b => ({
    name:         b.barangay_name || b.sensor_name || `Sensor ${b.sensor_id}`,
    co2:          parseFloat(b.co2_density) || 0,
    co2Display:   formatCO2Index(b.co2_density),
    carbon_level: b.carbon_level,
  }));

  // Trend: compare top two by co2_density
  const trendUp   = top3.length >= 2 ? top3[0].co2 > top3[1].co2 : false;
  const trendDiff = top3.length >= 2 && top3[1].co2 !== 0
    ? Math.abs(((top3[0].co2 - top3[1].co2) / top3[1].co2) * 100).toFixed(1)
    : '0';

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = {
    labels: ['Normal', 'Low', 'Mod', 'High', 'V.High'],
    datasets: [{
      data: [
        carbonCounts['NORMAL'],
        carbonCounts['LOW'],
        carbonCounts['MODERATE'],
        carbonCounts['HIGH'],
        carbonCounts['VERY HIGH'],
      ],
    }],
  };

  // ── Period label ───────────────────────────────────────────────────────────
  const periodLabel = !selected
    ? 'Loading…'
    : reportType === 'monthly'
      ? `${MONTHS[selected.month]} ${selected.year}`
      : selected.startDate && selected.endDate
        ? `${MONTHS[selected.month].slice(0, 3)} — Week ${selected.weekNum}`
        : `${MONTHS[selected.month]} ${selected.year}`;

  const veryHighCount = carbonCounts['VERY HIGH'];
  const avgTemp       = avgOf('temperature_c').toFixed(1);
  const avgHumid      = avgOf('humidity').toFixed(1);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5C4D" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reporting</Text>
        <TouchableOpacity>
          <Ionicons name="download-outline" size={24} color="#2D2D2D" />
        </TouchableOpacity>
      </View>

      <CalendarPicker
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        mode={reportType}
        selected={selected}
        onSelect={setSelected}
        earliestDate={earliestDate}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF5C4D']} />
        }
      >
        {/* ── Toggle ── */}
        <View style={styles.toggleContainer}>
          {[
            { key: 'monthly', label: 'Monthly' },
            { key: 'weekly',  label: 'Weekly'  },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.toggleButton, reportType === key && styles.toggleButtonActive]}
              onPress={() => handleReportTypeChange(key)}
            >
              <Text style={[styles.toggleText, reportType === key && styles.toggleTextActive]}>
                {label} Report
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Date Selector ── */}
        <TouchableOpacity style={styles.dateCard} onPress={() => setCalendarVisible(true)}>
          <View style={styles.rowCenter}>
            <MaterialCommunityIcons name="calendar-month" size={20} color="#FF5C4D" />
            <Text style={styles.dateText}>{periodLabel}</Text>
          </View>
          <View style={styles.rowCenter}>
            <Text style={styles.sensorCountSmall}>
              {hasData ? `${filtered.length} sensors` : 'No data'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#9CA3AF" style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>

        {/* ── No data state ── */}
        {!hasData ? (
          <View style={styles.noDataCard}>
            <MaterialCommunityIcons name="calendar-remove-outline" size={48} color="#D1D5DB" />
            <Text style={styles.noDataTitle}>No readings in {periodLabel}</Text>
            <Text style={styles.noDataSub}>
              {reportType === 'weekly'
                ? 'Pick a different week or switch to Monthly view.'
                : 'Sensor data exists only for months with readings. Try another month.'}
            </Text>
            <TouchableOpacity
              style={styles.noDataBtn}
              onPress={() => {
                if (earliestDate) {
                  const d = new Date(earliestDate);
                  setSelected({ year: d.getFullYear(), month: d.getMonth() });
                }
              }}
            >
              <Text style={styles.noDataBtnText}>Jump to data</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Summary Card ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Carbon Emission Summary</Text>

              <View style={styles.summaryTopRow}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="leaf" size={36} color="#10B981" />
                  <View style={styles.co2Badge}>
                    <Text style={styles.co2Text}>CO₂</Text>
                  </View>
                </View>
                <View style={styles.statsContainer}>
                  {/* Show avg CO2 index, not a "total ppm" which was meaningless */}
                  <Text style={styles.bigNumber}>{avgCO2Index}</Text>
                  <Text style={styles.unitText}>
                    Avg CO₂ Index · {filtered.length} sensors · {periodLabel}
                  </Text>
                  <View style={styles.trendRow}>
                    <MaterialCommunityIcons
                      name={trendUp ? 'triangle' : 'triangle-down'}
                      size={12}
                      color={trendUp ? '#FF5C4D' : '#10B981'}
                    />
                    <Text style={[styles.trendText, { color: trendUp ? '#FF5C4D' : '#10B981' }]}>
                      {trendDiff}% gap (#1 vs #2)
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Top 3 list — sorted by severity */}
              {top3.length === 0 ? (
                <Text style={styles.emptyText}>No barangay data</Text>
              ) : (
                top3.map((loc, i) => (
                  <View key={i} style={styles.locationRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.locName}>{loc.name}</Text>
                      {loc.carbon_level && (
                        <Text style={[styles.locLevel, { color: getCarbonColor(loc.carbon_level) }]}>
                          {loc.carbon_level}
                        </Text>
                      )}
                    </View>
                    {/* Display raw index value, not "X ppm" */}
                    <Text style={styles.locValue}>Index: {loc.co2Display}</Text>
                  </View>
                ))
              )}
            </View>

            {/* ── Carbon Level Breakdown ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Carbon Level Breakdown</Text>
              <Text style={styles.cardSubtitle}>Sensor count — {periodLabel}</Text>

              {Object.entries(carbonCounts).map(([level, count]) => {
                const color = getCarbonColor(level);
                const pct   = filtered.length > 0
                  ? Math.round((count / filtered.length) * 100)
                  : 0;
                return (
                  <View key={level} style={styles.breakdownRow}>
                    <View style={styles.breakdownLeft}>
                      <View style={[styles.levelDot, { backgroundColor: color }]} />
                      <Text style={styles.breakdownLabel}>{level}</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.breakdownCount}>{count}</Text>
                  </View>
                );
              })}
            </View>

            {/* ── Bar Chart ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Carbon Level per Sensor</Text>
              <Text style={styles.cardSubtitle}>{periodLabel}</Text>
              <View style={styles.chartContainer}>
                <BarChart
                  data={chartData}
                  width={screenWidth - 64}
                  height={200}
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(255, 92, 77, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(45, 45, 45, ${opacity})`,
                    barPercentage: 0.6,
                    propsForLabels: { fontSize: 10 },
                  }}
                  style={{ borderRadius: 16, marginTop: 10 }}
                  showValuesOnTopOfBars
                  withInnerLines={false}
                />
              </View>
            </View>

            {/* ── Actionable Insights ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Actionable Insights</Text>
              <View style={styles.insightList}>
                {top3[0] && (
                  <View style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.insightText}>
                      <Text style={{ fontWeight: '700' }}>{top3[0].name}</Text> has the
                      highest carbon level
                      {top3[0].carbon_level
                        ? <Text style={{ fontWeight: '700', color: getCarbonColor(top3[0].carbon_level) }}> ({top3[0].carbon_level})</Text>
                        : null
                      } — priority inspection recommended.
                    </Text>
                  </View>
                )}
                {top3[1] && (
                  <View style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.insightText}>
                      <Text style={{ fontWeight: '700' }}>{top3[1].name}</Text> is 2nd
                      {top3[1].carbon_level
                        ? <Text style={{ color: getCarbonColor(top3[1].carbon_level) }}> at {top3[1].carbon_level}</Text>
                        : null
                      }. Consider ventilation improvements.
                    </Text>
                  </View>
                )}
                {veryHighCount > 0 && (
                  <View style={styles.bulletRow}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.insightText}>
                      <Text style={{ fontWeight: '700', color: '#D64545' }}>
                        {veryHighCount} sensor{veryHighCount > 1 ? 's' : ''}
                      </Text>{' '}
                      at VERY HIGH level in {periodLabel} — immediate action required.
                    </Text>
                  </View>
                )}
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.insightText}>
                    Avg temperature <Text style={{ fontWeight: '700' }}>{avgTemp}°C</Text>,
                    avg humidity <Text style={{ fontWeight: '700' }}>{avgHumid}%</Text>{' '}
                    across {filtered.length} active sensors.
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F8F9FA' },
  center:             { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:        { marginTop: 12, fontSize: 16, color: '#2D2D2D', fontWeight: '500' },

  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  headerTitle:        { fontSize: 24, fontWeight: '700', color: '#2D2D2D' },

  toggleContainer:    { flexDirection: 'row', marginHorizontal: 20, marginTop: 20, gap: 12 },
  toggleButton:       { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  toggleButtonActive: { backgroundColor: '#FF5C4D', borderColor: '#FF5C4D' },
  toggleText:         { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  toggleTextActive:   { color: '#FFFFFF' },

  dateCard:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 16, padding: 14, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  dateText:           { fontSize: 15, fontWeight: '600', marginLeft: 10, color: '#2D2D2D' },
  sensorCountSmall:   { fontSize: 12, color: '#9CA3AF' },
  rowCenter:          { flexDirection: 'row', alignItems: 'center' },

  noDataCard:         { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 40, alignItems: 'center', marginHorizontal: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  noDataTitle:        { fontSize: 17, fontWeight: '700', color: '#2D2D2D', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  noDataSub:          { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  noDataBtn:          { backgroundColor: '#FF5C4D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  noDataBtnText:      { color: '#fff', fontWeight: '700', fontSize: 14 },

  card:               { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 16, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle:          { fontSize: 17, fontWeight: '700', color: '#2D2D2D', marginBottom: 4 },
  cardSubtitle:       { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
  emptyText:          { color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },

  summaryTopRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 16 },
  iconCircle:         { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 20, backgroundColor: '#F0FFF4' },
  co2Badge:           { position: 'absolute', bottom: 14 },
  co2Text:            { fontSize: 8, fontWeight: '700', color: '#10B981' },
  statsContainer:     { flex: 1 },
  bigNumber:          { fontSize: 24, fontWeight: '700', color: '#10B981' },
  unitText:           { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  trendRow:           { flexDirection: 'row', alignItems: 'center' },
  trendText:          { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  divider:            { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },

  locationRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  locName:            { fontSize: 14, color: '#2D2D2D', fontWeight: '600' },
  locLevel:           { fontSize: 10, fontWeight: '700', marginTop: 2 },
  locValue:           { fontSize: 13, fontWeight: '700', color: '#2D2D2D' },

  breakdownRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  breakdownLeft:      { flexDirection: 'row', alignItems: 'center', width: 110 },
  levelDot:           { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  breakdownLabel:     { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  barTrack:           { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, marginHorizontal: 10, overflow: 'hidden' },
  barFill:            { height: '100%', borderRadius: 4 },
  breakdownCount:     { fontSize: 13, fontWeight: '700', color: '#1F2937', width: 24, textAlign: 'right' },

  chartContainer:     { alignItems: 'center', overflow: 'hidden', marginTop: 8 },

  insightList:        { marginTop: 8 },
  bulletRow:          { flexDirection: 'row', marginBottom: 14, paddingRight: 10 },
  bulletPoint:        { fontSize: 18, marginRight: 10, color: '#FF5C4D', lineHeight: 20 },
  insightText:        { fontSize: 14, color: '#2D2D2D', flex: 1, lineHeight: 22 },
});