import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import {
  Settings, ChevronDown, Thermometer, CloudFog,
  Wind, Droplets, AlertTriangle, Gauge, Calendar,
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

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setAppSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch (_) {}
    })();
  }, []);

  const handleSettingsClose = async () => {
    setSettingsVisible(false);
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setAppSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch (_) {}
  };

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

  const heatThresholdLabel = appSettings.tempUnit === 'fahrenheit'
    ? `${((appSettings.heatStressThreshold * 9) / 5 + 32).toFixed(0)}°F`
    : `${appSettings.heatStressThreshold}°C`;

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

      <SettingsScreen visible={settingsVisible} onClose={handleSettingsClose} />

      <CalendarPicker
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        mode="monthly"
        selected={selected}
        onSelect={setSelected}
        earliestDate={earliestDate}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ENVI Analytics</Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => setSettingsVisible(true)}>
            <Settings color="#2D2D2D" size={22} />
          </TouchableOpacity>
        </View>

        {/* ── Date Selector ── */}
        <TouchableOpacity style={styles.dateSelector} onPress={() => setCalendarVisible(true)}>
          <View style={styles.dateSelectorLeft}>
            <Calendar color="#FF5C4D" size={16} />
            <Text style={styles.dateText} numberOfLines={1}>{periodLabel}</Text>
          </View>
          <View style={styles.dateSelectorRight}>
            <Text style={styles.sensorCountText} numberOfLines={1}>
              {hasData ? `${merged.length} sensors` : 'No data'}
            </Text>
            <ChevronDown color="#9CA3AF" size={16} />
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

                {/* Avg Temperature */}
                <View style={styles.card}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FFF0EE' }]}>
                    <Thermometer color="#FF5C4D" size={20} />
                  </View>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                    {avgTempDisplay}
                  </Text>
                  <Text style={styles.metricLabel} numberOfLines={1}>Avg Temperature</Text>
                </View>

                {/* Avg CO2 */}
                <View style={styles.card}>
                  <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Wind color="#3B82F6" size={20} />
                  </View>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                    {avgCO2Raw}
                  </Text>
                  <Text style={styles.metricLabel} numberOfLines={1}>Avg CO₂ Index</Text>
                </View>

              </View>
              <View style={styles.row}>

                {/* Avg Humidity */}
                <View style={styles.card}>
                  <View style={[styles.iconCircle, { backgroundColor: '#ECFEFF' }]}>
                    <Droplets color="#06B6D4" size={20} />
                  </View>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                    {avgHumidDisplay}
                  </Text>
                  <Text style={styles.metricLabel} numberOfLines={1}>Avg Humidity</Text>
                </View>

                {/* Heat Stress */}
                <View style={styles.card}>
                  <View style={[styles.iconCircle, { backgroundColor: '#FFF7ED' }]}>
                    <AlertTriangle color="#F97316" size={20} />
                  </View>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                    {heatStressCount}
                  </Text>
                  <Text style={styles.metricLabel} numberOfLines={1}>Heat Stress</Text>
                  <Text style={styles.metricSub} numberOfLines={1}>≥{heatThresholdLabel}</Text>
                </View>

              </View>
            </View>

            {/* ── Carbon Level Pills ── */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle} numberOfLines={1}>Carbon Level Distribution</Text>

              <View style={styles.pillsRow}>
                {Object.entries(carbonCounts).map(([level, count]) => {
                  const color = getCarbonColor(level);
                  const shortLabel = level === 'VERY HIGH' ? 'V.HIGH' : level;
                  return (
                    <View
                      key={level}
                      style={[styles.pill, { backgroundColor: color + '22', borderColor: color }]}
                    >
                      <Text style={[styles.pillCount, { color }]} numberOfLines={1}>
                        {count}
                      </Text>
                      <Text style={[styles.pillLabel, { color }]} numberOfLines={1}>
                        {shortLabel}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Heat Index Row */}
              <View style={styles.heatRow}>
                <Gauge color="#F97316" size={16} />
                <Text style={styles.heatRowLabel} numberOfLines={1}>Heat Index:</Text>
                <Text style={styles.heatRowValue} numberOfLines={1}>{avgHeatDisplay}</Text>
                {veryHighCount > 0 && (
                  <View style={styles.alertPill}>
                    <Text style={styles.alertText} numberOfLines={1}>
                      {veryHighCount} VERY HIGH ⚠️
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── Top 5 Barangays ── */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
               Top Barangays By Carbon Emmission
              </Text>

              {topBarangays.map((item, index) => {
                const rank     = index + 1;
                const color    = getRankColor(rank);
                const co2      = parseFloat(item.co2_density) || 0;
                const pct      = maxCO2 > 0 ? `${Math.round((co2 / maxCO2) * 100)}%` : '0%';
                const lvlColor = getCarbonColor(item.carbon_level);

                return (
                  <View key={`${item.sensor_id}-${item.data_id}`} style={styles.listItem}>
                    {/* Rank Badge */}
                    <View style={[styles.rankBadge, { backgroundColor: rank <= 3 ? color : '#F3F4F6' }]}>
                      <Text style={[styles.rankText, { color: rank <= 3 ? '#FFFFFF' : '#2D2D2D' }]}>
                        {rank}
                      </Text>
                    </View>

                    {/* Content */}
                    <View style={styles.progressContainer}>
                      {/* Name + Level + CO2 value */}
                      <View style={styles.progressLabelRow}>
                        <Text style={styles.barangayName} numberOfLines={1}>
                          {item.barangay_name || item.sensor_name || `Sensor ${item.sensor_id}`}
                        </Text>
                        {item.carbon_level ? (
                          <View style={[styles.inlineLevelBadge, { backgroundColor: lvlColor + '22' }]}>
                            <Text style={[styles.inlineLevelText, { color: lvlColor }]} numberOfLines={1}>
                              {item.carbon_level}
                            </Text>
                          </View>
                        ) : null}
                        <Text style={styles.barangayValue} numberOfLines={1}>
                          {co2 > 0 ? formatCO2(item.co2_density) : '—'}
                        </Text>
                      </View>

                      {/* Progress bar */}
                      <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { backgroundColor: color, width: pct }]} />
                      </View>

                      {/* Detail row */}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailText} numberOfLines={1}>
                          🌡 {formatTemp(item.temperature_c, appSettings.tempUnit)}
                        </Text>
                        <Text style={styles.detailText} numberOfLines={1}>
                          💧 {item.humidity != null ? `${parseFloat(item.humidity).toFixed(0)}%` : '—'}
                        </Text>
                        <Text style={styles.detailText} numberOfLines={1}>
                          🔥 {formatTemp(item.heat_index_c, appSettings.tempUnit)}
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
                <CloudFog color="#6B7280" size={18} />
                <Text style={styles.footerLabel} numberOfLines={1}>
                  Air Quality — {periodLabel}
                </Text>
              </View>

              {/* Summary counts */}
              <View style={styles.summaryGrid}>
                {[
                  { label: 'V.High',   count: carbonCounts['VERY HIGH'], color: '#D64545' },
                  { label: 'High',     count: carbonCounts['HIGH'],      color: '#E8A75D' },
                  { label: 'Moderate', count: carbonCounts['MODERATE'],  color: '#F59E0B' },
                  { label: 'Low',      count: carbonCounts['LOW'],       color: '#3B82F6' },
                  { label: 'Normal',   count: carbonCounts['NORMAL'],    color: '#22C55E' },
                ].map(({ label, count, color }) => (
                  <View key={label} style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color }]} numberOfLines={1}>
                      {count}
                    </Text>
                    <Text style={styles.summaryLabel} numberOfLines={1}>{label}</Text>
                  </View>
                ))}
              </View>

              {/* Trend comparison */}
              {topBarangays.length >= 2 && (
                <View style={styles.comparisonRow}>
                  <View style={[
                    styles.comparisonBadge,
                    { backgroundColor: trendUp ? '#FFF0EE' : '#F0FFF4' }
                  ]}>
                    <Text style={[
                      styles.comparisonText,
                      { color: trendUp ? '#FF5C4D' : '#10B981' }
                    ]} numberOfLines={1}>
                      {trendUp ? '↑' : '↓'} {trendDiff}%
                    </Text>
                  </View>
                  <Text style={styles.comparisonLabel} numberOfLines={1}>#1 vs #2 CO₂ index</Text>
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
  // ── Base ──────────────────────────────────────────────────────────────────
  container:            { flex: 1, backgroundColor: '#F8F9FA' },
  centerContent:        { justifyContent: 'center', alignItems: 'center' },
  statusBarPlaceholder: { height: Platform.OS === 'android' ? StatusBar.currentHeight : 0, backgroundColor: '#F8F9FA' },
  scrollContainer:      { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  // ── States ────────────────────────────────────────────────────────────────
  loadingText:          { marginTop: 12, fontSize: 15, color: '#2D2D2D', fontWeight: '500' },
  errorText:            { fontSize: 15, color: '#FF5C4D', marginBottom: 16, fontWeight: '600' },
  retryButton:          { backgroundColor: '#FF5C4D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryButtonText:      { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // ── Header ────────────────────────────────────────────────────────────────
  header:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle:          { fontSize: 22, fontWeight: '700', color: '#2D2D2D' },
  iconButton:           { padding: 8, borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },

  // ── Date Selector ─────────────────────────────────────────────────────────
  dateSelector:         { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  dateSelectorLeft:     { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dateSelectorRight:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
  dateText:             { fontSize: 14, fontWeight: '600', color: '#2D2D2D' },
  sensorCountText:      { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  // ── No-data card ──────────────────────────────────────────────────────────
  noDataCard:           { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 36, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  noDataTitle:          { fontSize: 16, fontWeight: '700', color: '#2D2D2D', marginTop: 14, marginBottom: 8, textAlign: 'center' },
  noDataSub:            { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  noDataBtn:            { backgroundColor: '#FF5C4D', paddingHorizontal: 22, paddingVertical: 11, borderRadius: 10 },
  noDataBtnText:        { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Metrics Grid ──────────────────────────────────────────────────────────
  metricsGrid:          { marginBottom: 16 },
  row:                  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },

  card:                 {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle:           { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  metricValue:          { fontSize: 20, fontWeight: '700', color: '#2D2D2D', marginBottom: 2 },
  metricLabel:          { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  metricSub:            { fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 2 },

  // ── Section card ──────────────────────────────────────────────────────────
  sectionContainer:     { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionTitle:         { fontSize: 14, fontWeight: '600', color: '#2D2D2D', marginBottom: 14 },

  // ── Pills ─────────────────────────────────────────────────────────────────
  pillsRow:             { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  pill:                 {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    marginHorizontal: 2,
    minWidth: 0,          // allows flex to shrink properly
  },
  pillCount:            { fontSize: 16, fontWeight: '700' },
  pillLabel:            { fontSize: 8, fontWeight: '600', marginTop: 2 },

  // ── Heat index row ────────────────────────────────────────────────────────
  heatRow:              { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, gap: 6 },
  heatRowLabel:         { fontSize: 12, color: '#6B7280', flexShrink: 1 },
  heatRowValue:         { fontSize: 13, fontWeight: '700', color: '#F97316', flexShrink: 1 },
  alertPill:            { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 'auto' },
  alertText:            { fontSize: 10, color: '#D64545', fontWeight: '700' },

  // ── Barangay List ─────────────────────────────────────────────────────────
  listItem:             { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  rankBadge:            { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1, flexShrink: 0 },
  rankText:             { fontSize: 11, fontWeight: '700' },
  progressContainer:    { flex: 1, minWidth: 0 },

  progressLabelRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  barangayName:         { fontSize: 13, fontWeight: '600', color: '#2D2D2D', flexShrink: 1, marginRight: 5 },
  inlineLevelBadge:     { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5, marginRight: 5, flexShrink: 0 },
  inlineLevelText:      { fontSize: 8, fontWeight: '700' },
  barangayValue:        { fontSize: 12, color: '#6B7280', fontWeight: '600', marginLeft: 'auto', flexShrink: 0 },

  progressBarBackground:{ height: 7, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill:      { height: '100%', borderRadius: 4 },

  detailRow:            { flexDirection: 'row', justifyContent: 'space-between' },
  detailText:           { fontSize: 11, color: '#9CA3AF', flexShrink: 1 },

  // ── Footer ────────────────────────────────────────────────────────────────
  footerContainer:      { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  footerHeader:         { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  footerLabel:          { fontSize: 13, fontWeight: '500', color: '#6B7280', flexShrink: 1 },

  summaryGrid:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  summaryItem:          { alignItems: 'center', flex: 1, minWidth: 0 },
  summaryCount:         { fontSize: 24, fontWeight: '700' },
  summaryLabel:         { fontSize: 10, color: '#6B7280', fontWeight: '500', marginTop: 2, textAlign: 'center' },

  comparisonRow:        { flexDirection: 'row', alignItems: 'center' },
  comparisonBadge:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 8 },
  comparisonText:       { fontSize: 13, fontWeight: '700' },
  comparisonLabel:      { fontSize: 13, color: '#6B7280', flexShrink: 1 },
});