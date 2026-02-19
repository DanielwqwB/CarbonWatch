import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import {
  Settings, ChevronDown, Thermometer, CloudFog,
  Wind, Droplets, TrendingUp, TrendingDown,
  Gauge, AlertTriangle, Calendar,
} from 'lucide-react-native';
import CalendarPicker from './Calendarpicker';
import SettingsScreen, { DEFAULT_SETTINGS } from './SettingsScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SENSOR_API      = 'https://bytetech-final1.onrender.com/sensor';
const SENSOR_DATA_API = 'https://bytetech-final1.onrender.com/sensor-data';
const STORAGE_KEY     = '@envi_settings';

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

const getRankColor = (rank) =>
  (['#FF5C4D','#FF7A6E','#FF9890','#FFB6B1','#FFC5C0'])[rank - 1] || '#F8F9FA';

const formatCO2 = (val) => {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return n.toFixed(4);
};

// Convert Celsius to Fahrenheit if needed
const formatTemp = (celsius, unit) => {
  if (celsius == null || isNaN(parseFloat(celsius))) return '—';
  const c = parseFloat(celsius);
  if (unit === 'fahrenheit') return `${((c * 9) / 5 + 32).toFixed(1)}°F`;
  return `${c.toFixed(1)}°C`;
};

export default function Dashboard() {
  const [loading, setLoading]                 = useState(true);
  const [sensorList, setSensorList]           = useState([]);
  const [dataList, setDataList]               = useState([]);
  const [error, setError]                     = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [earliestDate, setEarliestDate]       = useState(null);
  const [selected, setSelected]               = useState(null);
  const [appSettings, setAppSettings]         = useState(DEFAULT_SETTINGS);

  // Load settings from storage
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setAppSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch (_) {}
    })();
  }, []);

  // Re-read settings every time the settings modal closes (user may have changed them)
  const handleSettingsClose = async () => {
    setSettingsVisible(false);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setAppSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch (_) {}
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(false);

      const [sensorRes, dataRes] = await Promise.all([
        fetch(SENSOR_API),
        fetch(SENSOR_DATA_API),
      ]);

      const sensors  = await sensorRes.json();
      const dataJson = await dataRes.json();
      const records  = Array.isArray(dataJson) ? dataJson : (dataJson.data || []);

      setSensorList(Array.isArray(sensors) ? sensors : []);
      setDataList(records);

      const dates = records
        .map(d => d.recorded_at).filter(Boolean)
        .map(d => new Date(d)).sort((a, b) => a - b);

      if (dates.length) {
        setEarliestDate(dates[0].toISOString());
        const latest = dates[dates.length - 1];
        setSelected({ year: latest.getFullYear(), month: latest.getMonth() });
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Merge: latest record per sensor for selected month ────────────────────
  const merged = useMemo(() => {
    if (!sensorList.length) return [];

    const sensorMap = {};
    sensorList.forEach(s => { sensorMap[s.sensor_id] = s; });

    const filtered = selected
      ? dataList.filter(d => {
          if (!d.recorded_at) return false;
          const dt = new Date(d.recorded_at);
          return dt.getFullYear() === selected.year && dt.getMonth() === selected.month;
        })
      : dataList;

    const latestMap = {};
    filtered.forEach(d => {
      const existing = latestMap[d.sensor_id];
      if (!existing || new Date(d.recorded_at) > new Date(existing.recorded_at)) {
        latestMap[d.sensor_id] = d;
      }
    });

    return Object.values(latestMap).map(d => ({
      ...(sensorMap[d.sensor_id] || {}),
      ...d,
    }));
  }, [sensorList, dataList, selected]);

  const hasData = merged.length > 0;

  // ── Derived metrics (respects settings) ───────────────────────────────────
  const avgOf = (key) => {
    const valid = merged.filter(s => s[key] != null && !isNaN(parseFloat(s[key])));
    if (!valid.length) return null;
    return valid.reduce((sum, x) => sum + parseFloat(x[key]), 0) / valid.length;
  };

  const avgTempRaw  = avgOf('temperature_c');
  const avgHumidRaw = avgOf('humidity');
  const avgHeatRaw  = avgOf('heat_index_c');

  const avgTempDisplay  = avgTempRaw  != null ? formatTemp(avgTempRaw,  appSettings.tempUnit) : '—';
  const avgHumidDisplay = avgHumidRaw != null ? `${avgHumidRaw.toFixed(1)}%` : '—';
  const avgHeatDisplay  = avgHeatRaw  != null ? formatTemp(avgHeatRaw,  appSettings.tempUnit) : '—';

  const avgCO2Raw = (() => {
    const valid = merged.filter(s => s.co2_density != null && !isNaN(parseFloat(s.co2_density)));
    if (!valid.length) return '—';
    return (valid.reduce((sum, x) => sum + parseFloat(x.co2_density), 0) / valid.length).toFixed(4);
  })();

  // Use the configurable heat stress threshold from settings
  const heatStressCount = merged.filter(
    s => parseFloat(s.heat_index_c) >= appSettings.heatStressThreshold
  ).length;

  const veryHighCount = merged.filter(
    s => (s.carbon_level || '').toUpperCase() === 'VERY HIGH'
  ).length;

  const carbonCounts = { 'VERY HIGH': 0, HIGH: 0, MODERATE: 0, LOW: 0, NORMAL: 0 };
  merged.forEach(s => {
    const l = (s.carbon_level || 'NORMAL').toUpperCase();
    if (carbonCounts[l] !== undefined) carbonCounts[l]++;
  });

  const severityRank = { 'VERY HIGH': 4, HIGH: 3, MODERATE: 2, LOW: 1, NORMAL: 0 };
  const topBarangays = [...merged]
    .filter(s => s.co2_density != null || s.carbon_level != null)
    .sort((a, b) => {
      const aRank = severityRank[(a.carbon_level || 'NORMAL').toUpperCase()] ?? 0;
      const bRank = severityRank[(b.carbon_level || 'NORMAL').toUpperCase()] ?? 0;
      if (bRank !== aRank) return bRank - aRank;
      return (parseFloat(b.co2_density) || 0) - (parseFloat(a.co2_density) || 0);
    })
    .slice(0, 5);

  const maxCO2 = topBarangays.length
    ? Math.max(...topBarangays.map(s => parseFloat(s.co2_density) || 0))
    : 1;

  const trendUp = topBarangays.length >= 2
    ? parseFloat(topBarangays[0].co2_density) > parseFloat(topBarangays[1].co2_density)
    : false;
  const trendDiff = topBarangays.length >= 2 && parseFloat(topBarangays[1].co2_density) !== 0
    ? Math.abs(
        ((parseFloat(topBarangays[0].co2_density) - parseFloat(topBarangays[1].co2_density))
          / parseFloat(topBarangays[1].co2_density)) * 100
      ).toFixed(1)
    : '0';

  const periodLabel = selected
    ? `${MONTHS[selected.month]} ${selected.year}`
    : 'Loading…';

  // ── Loading / error ────────────────────────────────────────────────────────
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

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorText}>Failed to load data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusBarPlaceholder} />

      {/* Settings Modal */}
      <SettingsScreen visible={settingsVisible} onClose={handleSettingsClose} />

      {/* Calendar Picker Modal */}
      <CalendarPicker
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        mode="monthly"
        selected={selected}
        onSelect={setSelected}
        earliestDate={earliestDate}
      />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ENVI Analytics</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setSettingsVisible(true)}
          >
            <Settings color="#2D2D2D" size={24} />
          </TouchableOpacity>
        </View>

        {/* ── Date Selector ── */}
        <TouchableOpacity style={styles.dateSelector} onPress={() => setCalendarVisible(true)}>
          <View style={styles.dateSelectorLeft}>
            <Calendar color="#FF5C4D" size={18} />
            <Text style={styles.dateText}>{periodLabel}</Text>
          </View>
          <View style={styles.dateSelectorRight}>
            <Text style={styles.sensorCountText}>
              {hasData ? `${merged.length} sensors` : 'No data'}
            </Text>
            <ChevronDown color="#9CA3AF" size={18} />
          </View>
        </TouchableOpacity>

        {/* ── No data state ── */}
        {!hasData ? (
          <View style={styles.noDataCard}>
            <Calendar color="#D1D5DB" size={40} />
            <Text style={styles.noDataTitle}>No readings in {periodLabel}</Text>
            <Text style={styles.noDataSub}>
              Sensor data was first recorded in{' '}
              {earliestDate
                ? `${MONTHS[new Date(earliestDate).getMonth()]} ${new Date(earliestDate).getFullYear()}`
                : '—'}
              . Try selecting that month.
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
            {/* ── Metrics Grid ── */}
            <View style={styles.metricsGrid}>
              <View style={styles.row}>
                <View style={styles.card}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FFF0EE' }]}>
                    <Thermometer color="#FF5C4D" size={22} />
                  </View>
                  <Text style={styles.metricValue}>{avgTempDisplay}</Text>
                  <Text style={styles.metricLabel}>Avg Temperature</Text>
                </View>
                <View style={styles.card}>
                  <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Wind color="#3B82F6" size={22} />
                  </View>
                  <Text style={styles.metricValue}>{avgCO2Raw}</Text>
                  <Text style={styles.metricLabel}>Avg CO₂ Index</Text>
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.card}>
                  <View style={[styles.iconCircle, { backgroundColor: '#ECFEFF' }]}>
                    <Droplets color="#06B6D4" size={22} />
                  </View>
                  <Text style={styles.metricValue}>{avgHumidDisplay}</Text>
                  <Text style={styles.metricLabel}>Avg Humidity</Text>
                </View>
                <View style={styles.card}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FFF7ED' }]}>
                    <AlertTriangle color="#F97316" size={22} />
                  </View>
                  <Text style={styles.metricValue}>{heatStressCount}</Text>
                  <Text style={styles.metricLabel}>
                    Heat Stress{'\n'}
                    <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                      ≥{appSettings.tempUnit === 'fahrenheit'
                          ? `${((appSettings.heatStressThreshold * 9) / 5 + 32).toFixed(0)}°F`
                          : `${appSettings.heatStressThreshold}°C`}
                    </Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Carbon Level Pills ── */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Carbon Level Distribution</Text>
              <View style={styles.pillsRow}>
                {Object.entries(carbonCounts).map(([level, count]) => {
                  const color = getCarbonColor(level);
                  return (
                    <View key={level} style={[styles.pill, { backgroundColor: color + '22', borderColor: color }]}>
                      <Text style={[styles.pillCount, { color }]}>{count}</Text>
                      <Text style={[styles.pillLabel, { color }]}>
                        {level === 'VERY HIGH' ? 'V.HIGH' : level}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.heatRow}>
                <Gauge color="#F97316" size={18} />
                <Text style={styles.heatText}>
                  Avg Heat Index:{' '}
                  <Text style={{ fontWeight: '700', color: '#F97316' }}>{avgHeatDisplay}</Text>
                </Text>
                {veryHighCount > 0 && (
                  <View style={styles.alertPill}>
                    <Text style={styles.alertText}>{veryHighCount} VERY HIGH ⚠️</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── Top 5 Barangays ── */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>
                Top {topBarangays.length} Barangays by Carbon Level — {periodLabel}
              </Text>
              {topBarangays.map((item, index) => {
                const rank     = index + 1;
                const color    = getRankColor(rank);
                const co2      = parseFloat(item.co2_density) || 0;
                const pct      = maxCO2 > 0 ? `${Math.round((co2 / maxCO2) * 100)}%` : '0%';
                const lvlColor = getCarbonColor(item.carbon_level);

                return (
                  <View key={`${item.sensor_id}-${item.data_id}`} style={styles.listItem}>
                    <View style={[styles.rankBadge, { backgroundColor: rank <= 3 ? color : '#F8F9FA' }]}>
                      <Text style={[styles.rankText, { color: rank <= 3 ? '#FFFFFF' : '#2D2D2D' }]}>
                        {rank}
                      </Text>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressLabelRow}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.barangayName} numberOfLines={1}>
                            {item.barangay_name || item.sensor_name || `Sensor ${item.sensor_id}`}
                          </Text>
                          {item.carbon_level && (
                            <View style={[styles.inlineLevelBadge, { backgroundColor: lvlColor + '22' }]}>
                              <Text style={[styles.inlineLevelText, { color: lvlColor }]}>
                                {item.carbon_level}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.barangayValue}>
                          {co2 > 0 ? formatCO2(item.co2_density) : '—'}
                        </Text>
                      </View>
                      <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { backgroundColor: color, width: pct }]} />
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailText}>
                          🌡 {formatTemp(item.temperature_c, appSettings.tempUnit)}
                        </Text>
                        <Text style={styles.detailText}>
                          💧 {item.humidity != null ? `${parseFloat(item.humidity).toFixed(0)}%` : '—'}
                        </Text>
                        <Text style={styles.detailText}>
                          🔥 HI {formatTemp(item.heat_index_c, appSettings.tempUnit)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ── Footer Summary ── */}
            <View style={styles.footerContainer}>
              <View style={styles.footerHeader}>
                <CloudFog color="#6B7280" size={20} />
                <Text style={styles.footerLabel}>Air Quality Summary — {periodLabel}</Text>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryCount, { color: '#D64545' }]}>{carbonCounts['VERY HIGH']}</Text>
                  <Text style={styles.summaryLabel}>Very High</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryCount, { color: '#E8A75D' }]}>{carbonCounts['HIGH']}</Text>
                  <Text style={styles.summaryLabel}>High</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryCount, { color: '#F59E0B' }]}>{carbonCounts['MODERATE']}</Text>
                  <Text style={styles.summaryLabel}>Moderate</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryCount, { color: '#3B82F6' }]}>{carbonCounts['LOW']}</Text>
                  <Text style={styles.summaryLabel}>Low</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryCount, { color: '#22C55E' }]}>{carbonCounts['NORMAL']}</Text>
                  <Text style={styles.summaryLabel}>Normal</Text>
                </View>
              </View>

              {topBarangays.length >= 2 && (
                <View style={styles.comparisonRow}>
                  <View style={[styles.comparisonBadge, { backgroundColor: trendUp ? '#FFF0EE' : '#F0FFF4' }]}>
                    <Text style={[styles.comparisonText, { color: trendUp ? '#FF5C4D' : '#10B981' }]}>
                      {trendUp ? '↑' : '↓'} {trendDiff}%
                    </Text>
                  </View>
                  <Text style={styles.comparisonLabel}>#1 vs #2 CO₂ index</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:             { flex: 1, backgroundColor: '#F8F9FA' },
  centerContent:         { justifyContent: 'center', alignItems: 'center' },
  loadingText:           { marginTop: 12, fontSize: 16, color: '#2D2D2D', fontWeight: '500' },
  errorText:             { fontSize: 16, color: '#FF5C4D', marginBottom: 16, fontWeight: '600' },
  retryButton:           { backgroundColor: '#FF5C4D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryButtonText:       { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  statusBarPlaceholder:  { height: Platform.OS === 'android' ? StatusBar.currentHeight : 0, backgroundColor: '#F8F9FA' },
  scrollContainer:       { padding: 20, paddingBottom: 40 },

  header:                { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle:           { fontSize: 24, fontWeight: '700', color: '#2D2D2D' },
  iconButton:            { padding: 8, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },

  dateSelector:          { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  dateSelectorLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateSelectorRight:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText:              { fontSize: 15, fontWeight: '600', color: '#2D2D2D' },
  sensorCountText:       { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  noDataCard:            { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 40, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  noDataTitle:           { fontSize: 17, fontWeight: '700', color: '#2D2D2D', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  noDataSub:             { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  noDataBtn:             { backgroundColor: '#FF5C4D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  noDataBtnText:         { color: '#fff', fontWeight: '700', fontSize: 14 },

  metricsGrid:           { marginBottom: 20 },
  row:                   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  card:                  { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  iconCircle:            { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  metricValue:           { fontSize: 22, fontWeight: '700', color: '#2D2D2D', marginBottom: 4 },
  metricLabel:           { fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 18 },

  sectionContainer:      { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle:          { fontSize: 16, fontWeight: '600', color: '#2D2D2D', marginBottom: 16 },
  pillsRow:              { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  pill:                  { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, marginHorizontal: 3 },
  pillCount:             { fontSize: 18, fontWeight: '700' },
  pillLabel:             { fontSize: 9, fontWeight: '600', marginTop: 2 },
  heatRow:               { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', padding: 12, borderRadius: 10 },
  heatText:              { fontSize: 13, color: '#6B7280', marginLeft: 8, flex: 1 },
  alertPill:             { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  alertText:             { fontSize: 11, color: '#D64545', fontWeight: '700' },

  listItem:              { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  rankBadge:             { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  rankText:              { fontSize: 12, fontWeight: '700' },
  progressContainer:     { flex: 1 },
  progressLabelRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  barangayName:          { fontSize: 14, fontWeight: '600', color: '#2D2D2D', marginRight: 6, flexShrink: 1 },
  inlineLevelBadge:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  inlineLevelText:       { fontSize: 9, fontWeight: '700' },
  barangayValue:         { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  progressBarBackground: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill:       { height: '100%', borderRadius: 4 },
  detailRow:             { flexDirection: 'row', gap: 12 },
  detailText:            { fontSize: 11, color: '#9CA3AF' },

  footerContainer:       { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  footerHeader:          { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  footerLabel:           { fontSize: 14, fontWeight: '500', color: '#6B7280', marginLeft: 8 },
  summaryGrid:           { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryItem:           { alignItems: 'center', flex: 1 },
  summaryCount:          { fontSize: 28, fontWeight: '700' },
  summaryLabel:          { fontSize: 10, color: '#6B7280', fontWeight: '500', marginTop: 2, textAlign: 'center' },
  comparisonRow:         { flexDirection: 'row', alignItems: 'center' },
  comparisonBadge:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  comparisonText:        { fontSize: 14, fontWeight: '700' },
  comparisonLabel:       { fontSize: 14, color: '#6B7280' },
});