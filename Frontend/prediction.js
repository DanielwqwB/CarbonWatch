import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator, Modal, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// ─── API ──────────────────────────────────────────────────────────────────────
const HISTORY_URL  = 'https://ai-prediction-jwnp.onrender.com/api/predictions/history';
const INSIGHTS_URL = 'https://ai-prediction-jwnp.onrender.com/api/insights/latest';

// ─── Nodes ────────────────────────────────────────────────────────────────────
const NODES = [
  { id: 'all', label: 'All Nodes', icon: 'layers' },
  { id: '1',   label: 'Abella',   icon: 'radio'  },
  { id: '2',   label: 'Node 2',   icon: 'radio'  },
  { id: '3',   label: 'Node 3',   icon: 'radio'  },
];

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt     = (v, d = 1) => v != null ? Number(v).toFixed(d) : '—';
const fmtDate = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
};
const fmtTime = (s) => s ? new Date(s).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
const toYMD   = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const deriveStatus = (co2) => {
  if (co2 == null) return { color: 'gray',   label: 'Unknown',  message: 'No data available' };
  if (co2 < 400)   return { color: 'green',  label: 'Good',     message: 'CO₂ levels are within safe range' };
  if (co2 < 450)   return { color: 'yellow', label: 'Moderate', message: 'CO₂ levels are slightly elevated' };
  if (co2 < 500)   return { color: 'orange', label: 'High',     message: 'CO₂ levels are above normal' };
  return               { color: 'red',    label: 'Danger',   message: 'CO₂ levels are critically high' };
};

const statusColor = (s) =>
  ({ green: '#10B981', yellow: '#FBBF24', orange: '#F59E0B', red: '#FF5C4D', gray: '#9CA3AF' }[s?.color] ?? '#9CA3AF');

// Group flat prediction array into { "2026-02-20": { co2, temp, humidity } }
const groupByDate = (predictions) => {
  const map = {};
  predictions.forEach((p) => {
    if (!map[p.prediction_date]) map[p.prediction_date] = { runAt: p.run_at, model: p.model_used };
    if (p.target === 'co2_density')  map[p.prediction_date].co2  = p;
    if (p.target === 'temperature_c') map[p.prediction_date].temp = p;
    if (p.target === 'humidity')      map[p.prediction_date].hum  = p;
  });
  return map;
};

// ─── Mini bar chart ───────────────────────────────────────────────────────────
const BarChart = ({ data, color }) => {
  const vals   = data.map(d => d.val);
  const maxVal = Math.max(...vals);
  const minVal = Math.min(...vals);
  return (
    <View style={styles.barsContainer}>
      {data.map((item, i) => {
        const pct = ((item.val - minVal) / ((maxVal - minVal) || 1)) * 100;
        return (
          <View key={i} style={styles.barCol}>
            <Text style={styles.barTopLabel}>{item.val.toFixed(1)}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${Math.max(pct, 8)}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.barBottomLabel}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Calendar Modal ───────────────────────────────────────────────────────────
const CalendarModal = ({ visible, onClose, availableDates, selectedDate, onSelectDate }) => {
  const today      = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const firstDay   = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];

  // Blank cells before first day
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cal.overlay}>
        <View style={cal.sheet}>
          {/* Header */}
          <View style={cal.header}>
            <Text style={cal.title}>Pick a Date</Text>
            <TouchableOpacity onPress={onClose} style={cal.closeBtn}>
              <Feather name="x" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Month nav */}
          <View style={cal.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
              <Feather name="chevron-left" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={cal.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
              <Feather name="chevron-right" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View style={cal.dayLabelsRow}>
            {DAYS.map(d => <Text key={d} style={cal.dayLabel}>{d}</Text>)}
          </View>

          {/* Grid */}
          <View style={cal.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`blank-${i}`} style={cal.cell} />;
              const ymd      = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const hasData  = availableDates.includes(ymd);
              const isSelected = ymd === selectedDate;
              const isToday  = ymd === toYMD(today);
              return (
                <TouchableOpacity
                  key={ymd}
                  style={[
                    cal.cell,
                    isSelected && cal.cellSelected,
                    isToday && !isSelected && cal.cellToday,
                  ]}
                  onPress={() => hasData && onSelectDate(ymd)}
                  disabled={!hasData}
                >
                  <Text style={[
                    cal.cellText,
                    !hasData && cal.cellTextDisabled,
                    isSelected && cal.cellTextSelected,
                    isToday && !isSelected && cal.cellTextToday,
                  ]}>
                    {day}
                  </Text>
                  {hasData && !isSelected && <View style={cal.dot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={cal.legend}>
            <View style={cal.legendItem}>
              <View style={[cal.legendDot, { backgroundColor: '#FF5C4D' }]} />
              <Text style={cal.legendText}>Has data</Text>
            </View>
            <View style={cal.legendItem}>
              <View style={[cal.legendDot, { backgroundColor: '#E5E7EB' }]} />
              <Text style={cal.legendText}>No data</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PredictionScreen() {
  const [selectedNode, setSelectedNode] = useState('all');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // All history keyed by date
  const [historyMap,  setHistoryMap]  = useState({});
  const [availDates,  setAvailDates]  = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);   // null = today/latest

  const [insightData, setInsightData] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // ── Fetch all history + latest insight ──────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [histRes, insRes] = await Promise.all([
        fetch(HISTORY_URL),
        fetch(INSIGHTS_URL),
      ]);
      if (!histRes.ok) throw new Error('Failed to fetch history');
      if (!insRes.ok)  throw new Error('Failed to fetch insights');

      const histJson = await histRes.json();
      const insJson  = await insRes.json();

      const grouped = groupByDate(histJson.predictions ?? []);
      const dates   = Object.keys(grouped).sort((a, b) => b.localeCompare(a)); // newest first

      setHistoryMap(grouped);
      setAvailDates(dates);

      // Default to the most recent date
      if (!selectedDate && dates.length > 0) setSelectedDate(dates[0]);

      setInsightData({
        barangay:   insJson.barangay,
        text:       insJson.insight_text,
        date:       insJson.prediction_date,
        runAt:      insJson.run_at,
      });

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);   // eslint-disable-line

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  // ── Derive display data from selected date ───────────────────────────────────
  const dayData = selectedDate ? historyMap[selectedDate] : null;
  const co2     = dayData?.co2?.mean  ?? null;
  const temp    = dayData?.temp?.mean ?? null;
  const hum     = dayData?.hum?.mean  ?? null;
  const status  = deriveStatus(co2);

  // Simulated hourly curves from the day's mean values
  const baseTemp = temp ?? 25;
  const baseCO2  = co2  ?? 403;

  const hourlyTemp = [
    { label: '6AM',  val: baseTemp - 2.0 },
    { label: '9AM',  val: baseTemp - 0.5 },
    { label: '12PM', val: baseTemp + 1.5 },
    { label: '3PM',  val: baseTemp + 2.0 },
    { label: '5PM',  val: baseTemp + 1.0 },
    { label: '8PM',  val: baseTemp - 0.5 },
    { label: '11PM', val: baseTemp - 1.5 },
  ];
  const hourlyCO2 = [
    { label: '6AM',  val: baseCO2 - 5 },
    { label: '9AM',  val: baseCO2 + 3 },
    { label: '12PM', val: baseCO2 + 8 },
    { label: '3PM',  val: baseCO2 + 5 },
    { label: '5PM',  val: baseCO2     },
    { label: '8PM',  val: baseCO2 - 3 },
    { label: '11PM', val: baseCO2 - 6 },
  ];

  const isLatest  = selectedDate === availDates[0];
  const canGoBack = availDates.indexOf(selectedDate) < availDates.length - 1;
  const canGoFwd  = availDates.indexOf(selectedDate) > 0;

  const goBack = () => {
    const idx = availDates.indexOf(selectedDate);
    if (idx < availDates.length - 1) setSelectedDate(availDates[idx + 1]);
  };
  const goFwd = () => {
    const idx = availDates.indexOf(selectedDate);
    if (idx > 0) setSelectedDate(availDates[idx - 1]);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5C4D" />
          <Text style={styles.loadingText}>Loading predictions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AI Prediction</Text>
          <Text style={styles.headerSubtitle}>
            {isLatest ? 'Latest Report' : 'Historical Report'}
          </Text>
        </View>
        <View style={styles.livePill}>
          <View style={[styles.liveDot, !isLatest && { backgroundColor: '#9CA3AF' }]} />
          <Text style={[styles.liveText, !isLatest && { color: '#9CA3AF' }]}>
            {isLatest ? 'LIVE' : 'PAST'}
          </Text>
        </View>
      </View>

      {/* ── Node filter ── */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {NODES.map((node) => {
            const active = selectedNode === node.id;
            return (
              <TouchableOpacity
                key={node.id}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedNode(node.id)}
              >
                <Feather name={node.icon} size={12} color={active ? '#FFF' : '#6B7280'} style={{ marginRight: 5 }} />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {node.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Date navigator ── */}
      <View style={styles.dateNav}>
        <TouchableOpacity
          style={[styles.dateNavBtn, !canGoBack && styles.dateNavBtnDisabled]}
          onPress={goBack}
          disabled={!canGoBack}
        >
          <Feather name="chevron-left" size={20} color={canGoBack ? '#374151' : '#D1D5DB'} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateNavCenter} onPress={() => setCalendarOpen(true)}>
          <Feather name="calendar" size={14} color="#FF5C4D" style={{ marginRight: 7 }} />
          <Text style={styles.dateNavText}>{fmtDate(selectedDate)}</Text>
          <Feather name="chevron-down" size={14} color="#9CA3AF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dateNavBtn, !canGoFwd && styles.dateNavBtnDisabled]}
          onPress={goFwd}
          disabled={!canGoFwd}
        >
          <Feather name="chevron-right" size={20} color={canGoFwd ? '#374151' : '#D1D5DB'} />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={fetchAll} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* No data for selected date */}
        {!dayData && !error && (
          <View style={styles.emptyCard}>
            <Feather name="inbox" size={36} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Data</Text>
            <Text style={styles.emptyText}>No predictions found for this date.</Text>
          </View>
        )}

        {dayData && (
          <>
            {/* Run info pill */}
            <View style={styles.runInfoRow}>
              <Feather name="cpu" size={12} color="#9CA3AF" style={{ marginRight: 5 }} />
              <Text style={styles.runInfoText}>
                Model: {dayData.model ?? 'LSTM'} · Ran {fmtTime(dayData.runAt)}
              </Text>
            </View>

            {/* ── Metric cards ── */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { borderTopColor: '#FF5C4D' }]}>
                <Text style={styles.metricLabel}>CO₂</Text>
                <Text style={[styles.metricValue, { color: '#FF5C4D' }]}>{fmt(co2)}</Text>
                <Text style={styles.metricUnit}>ppm</Text>
                <Text style={styles.metricRange}>
                  {fmt(dayData.co2?.min)} – {fmt(dayData.co2?.max)}
                </Text>
              </View>

              <View style={[styles.metricCard, { borderTopColor: '#F59E0B' }]}>
                <Text style={styles.metricLabel}>Temp</Text>
                <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{fmt(temp)}</Text>
                <Text style={styles.metricUnit}>°C</Text>
                <Text style={styles.metricRange}>
                  {fmt(dayData.temp?.min)} – {fmt(dayData.temp?.max)}
                </Text>
              </View>

              <View style={[styles.metricCard, { borderTopColor: '#3B82F6' }]}>
                <Text style={styles.metricLabel}>Humidity</Text>
                <Text style={[styles.metricValue, { color: '#3B82F6' }]}>{fmt(hum)}</Text>
                <Text style={styles.metricUnit}>%</Text>
                <Text style={styles.metricRange}>
                  {fmt(dayData.hum?.min)} – {fmt(dayData.hum?.max)}
                </Text>
              </View>
            </View>

            {/* ── Status badge ── */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor(status) }]}>
              <Text style={styles.statusLabel}>{status.label}</Text>
              <Text style={styles.statusMessage}>{status.message}</Text>
            </View>

            {/* ── Temperature chart ── */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>🌡 Temperature</Text>
                <Text style={styles.chartMeta}>Avg {fmt(temp)} °C</Text>
              </View>
              <BarChart data={hourlyTemp} color="#FF9890" />
            </View>

            {/* ── CO2 chart ── */}
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>💨 CO₂</Text>
                <Text style={styles.chartMeta}>Avg {fmt(co2, 0)} ppm</Text>
              </View>
              <BarChart data={hourlyCO2} color="#A78BFA" />
            </View>
          </>
        )}

        {/* ── AI Insight (always shows latest) ── */}
        {insightData && (
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={styles.insightIconBox}>
                <Text style={{ fontSize: 20 }}>🤖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>AI Insight — {insightData.barangay}</Text>
                <Text style={styles.insightMeta}>
                  {fmtDate(insightData.date)}  ·  {fmtTime(insightData.runAt)}
                </Text>
              </View>
            </View>
            <View style={styles.insightDivider} />
            <Text style={styles.insightBody}>{insightData.text}</Text>
          </View>
        )}

        {/* ── Date history list ── */}
        {availDates.length > 1 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>📅 All Reports</Text>
            {availDates.map((date) => {
              const d   = historyMap[date];
              const sel = date === selectedDate;
              return (
                <TouchableOpacity
                  key={date}
                  style={[styles.historyRow, sel && styles.historyRowActive]}
                  onPress={() => setSelectedDate(date)}
                >
                  <View style={styles.historyRowLeft}>
                    <View style={[styles.historyDot, { backgroundColor: statusColor(deriveStatus(d?.co2?.mean)) }]} />
                    <View>
                      <Text style={[styles.historyDate, sel && styles.historyDateActive]}>
                        {fmtDate(date)}
                      </Text>
                      <Text style={styles.historyMeta}>
                        CO₂ {fmt(d?.co2?.mean, 0)} ppm · {fmt(d?.temp?.mean)} °C · {fmt(d?.hum?.mean, 0)}%
                      </Text>
                    </View>
                  </View>
                  {sel && <Feather name="check-circle" size={16} color="#FF5C4D" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Refresh footer */}
        <TouchableOpacity style={styles.refreshFooter} onPress={fetchAll}>
          <Feather name="refresh-cw" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
          <Text style={styles.refreshFooterText}>Tap to refresh · auto-updates every 30 s</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Calendar Modal ── */}
      <CalendarModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        availableDates={availDates}
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setCalendarOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { marginTop: 12, fontSize: 15, color: '#6B7280', fontWeight: '500' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle:    { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  livePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, gap: 6,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF5C4D' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#FF5C4D', letterSpacing: 0.8 },

  // Node filter
  filterWrapper: {
    backgroundColor: '#FFFFFF', paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  filterScroll:         { paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F3F4F6',
    borderWidth: 1.5, borderColor: '#E5E7EB', marginRight: 8,
  },
  filterChipActive:     { backgroundColor: '#FF5C4D', borderColor: '#FF5C4D' },
  filterChipText:       { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterChipTextActive: { color: '#FFFFFF' },

  // Date navigator
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  dateNavBtn:         { padding: 8, borderRadius: 10, backgroundColor: '#F9FAFB' },
  dateNavBtnDisabled: { opacity: 0.3 },
  dateNavCenter: {
    flexDirection: 'row', alignItems: 'center',
    flex: 1, justifyContent: 'center',
    paddingVertical: 6, paddingHorizontal: 12,
    marginHorizontal: 8, borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  dateNavText: { fontSize: 15, fontWeight: '700', color: '#111827' },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36 },

  // Error
  errorCard: {
    backgroundColor: '#FEF3C7', padding: 14, borderRadius: 12, marginBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  errorText:   { flex: 1, fontSize: 13, color: '#92400E' },
  retryButton: { backgroundColor: '#FBBF24', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  retryText:   { color: '#78350F', fontWeight: '700', fontSize: 13 },

  // Empty
  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 40,
    alignItems: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 4 },
  emptyText:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  // Run info
  runInfoRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, paddingHorizontal: 2,
  },
  runInfoText: { fontSize: 12, color: '#9CA3AF' },

  // Metric cards
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metricCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  metricLabel: {
    fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricUnit:  { fontSize: 11, color: '#9CA3AF', marginTop: 2, marginBottom: 6 },
  metricRange: { fontSize: 9, color: '#D1D5DB', fontWeight: '500', textAlign: 'center' },

  // Status
  statusBadge: {
    padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  statusLabel:   { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 3 },
  statusMessage: { fontSize: 13, color: '#FFFFFF', opacity: 0.9 },

  // Charts
  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle:  { fontSize: 15, fontWeight: '700', color: '#111827' },
  chartMeta:   { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },

  barsContainer:  { flexDirection: 'row', height: 130, alignItems: 'flex-end', gap: 4 },
  barCol:         { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  barTopLabel:    { fontSize: 9, color: '#6B7280', fontWeight: '600', marginBottom: 3, textAlign: 'center' },
  barTrack:       { flex: 1, width: '80%', justifyContent: 'flex-end' },
  barFill:        { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  barBottomLabel: { fontSize: 9, color: '#9CA3AF', marginTop: 5, textAlign: 'center' },

  // Insight
  insightCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    borderLeftWidth: 4, borderLeftColor: '#FF5C4D',
  },
  insightHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  insightIconBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center',
  },
  insightTitle:   { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  insightMeta:    { fontSize: 11, color: '#9CA3AF' },
  insightDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 },
  insightBody:    { fontSize: 14, color: '#374151', lineHeight: 22 },

  // History list
  historyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  historyTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  historyRowActive: { backgroundColor: '#FEF2F2', marginHorizontal: -18, paddingHorizontal: 18, borderRadius: 10 },
  historyRowLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  historyDot:       { width: 10, height: 10, borderRadius: 5 },
  historyDate:      { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 2 },
  historyDateActive:{ color: '#FF5C4D' },
  historyMeta:      { fontSize: 11, color: '#9CA3AF' },

  // Refresh footer
  refreshFooter:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  refreshFooterText: { fontSize: 12, color: '#9CA3AF' },
});

// ─── Calendar styles ──────────────────────────────────────────────────────────
const cal = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  title:    { fontSize: 18, fontWeight: '800', color: '#111827' },
  closeBtn: { padding: 6, borderRadius: 10, backgroundColor: '#F3F4F6' },

  monthNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  navBtn:     { padding: 8, borderRadius: 10, backgroundColor: '#F9FAFB' },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },

  dayLabelsRow: {
    flexDirection: 'row', marginBottom: 8,
  },
  dayLabel: {
    flex: 1, textAlign: 'center',
    fontSize: 12, fontWeight: '600', color: '#9CA3AF',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%', aspectRatio: 1,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  cellSelected: { backgroundColor: '#FF5C4D', borderRadius: 12 },
  cellToday:    { backgroundColor: '#FEF2F2', borderRadius: 12 },
  cellText:         { fontSize: 14, fontWeight: '600', color: '#374151' },
  cellTextDisabled: { color: '#D1D5DB', fontWeight: '400' },
  cellTextSelected: { color: '#FFFFFF' },
  cellTextToday:    { color: '#FF5C4D' },
  dot: {
    position: 'absolute', bottom: 4,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#FF5C4D',
  },

  legend: {
    flexDirection: 'row', gap: 16, marginTop: 16,
    justifyContent: 'center',
  },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendText:  { fontSize: 12, color: '#6B7280' },
});