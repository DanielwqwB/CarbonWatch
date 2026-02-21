import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import CalendarPicker from './Calendarpicker';

const SENSOR_API      = 'https://bytetech-final1.onrender.com/sensor';
const SENSOR_DATA_API = 'https://bytetech-final1.onrender.com/sensor-data';
const INSIGHT_API     = 'https://ai-prediction-jwnp.onrender.com/api/realtime/insight/history?limit=5';
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

const formatCO2Index = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? '—' : n.toFixed(4);
};

const SEVERITY_RANK = { 'VERY HIGH': 4, HIGH: 3, MODERATE: 2, LOW: 1, NORMAL: 0 };

// ── Insight text parser ────────────────────────────────────────────────────────
const SECTION_CONFIG = {
  STATUS:         { icon: 'pulse-outline',              color: '#3B82F6', bg: '#EFF6FF', label: 'Current Status'     },
  RESIDENTS:      { icon: 'people-outline',             color: '#F59E0B', bg: '#FFFBEB', label: 'Resident Advisory'  },
  ALERT:          { icon: 'warning-outline',            color: '#D64545', bg: '#FEF2F2', label: 'Alert'              },
  RECOMMENDATION: { icon: 'checkmark-circle-outline',   color: '#10B981', bg: '#ECFDF5', label: 'Recommendation'     },
  FORECAST:       { icon: 'trending-up-outline',        color: '#8B5CF6', bg: '#F5F3FF', label: 'Forecast'           },
};
const DEFAULT_SECTION_CONFIG = { icon: 'information-circle-outline', color: '#6B7280', bg: '#F9FAFB', label: 'Info' };

const parseInsightText = (insightText) => {
  if (!insightText) return null;
  const sections = [];
  for (const block of insightText.split(/\n\n+/)) {
    const match = block.match(/^([A-Z ]+):\s*([\s\S]+)/);
    if (match) {
      const key    = match[1].trim().toUpperCase();
      const config = SECTION_CONFIG[key] || SECTION_CONFIG[key.split(' ')[0]] || DEFAULT_SECTION_CONFIG;
      sections.push({ key, label: config.label || key, body: match[2].trim(), config });
    } else if (block.trim()) {
      sections.push({ key: 'INFO', label: 'Info', body: block.trim(), config: DEFAULT_SECTION_CONFIG });
    }
  }
  return sections.length ? sections : null;
};

// ── Inline value highlighter ──────────────────────────────────────────────────
const HighlightedText = ({ text, baseStyle }) => {
  const pattern = /(\d+\.?\d*\s*(ppm|°C|%|mg\/m³))|(VERY HIGH|HIGH|MODERATE|LOW|NORMAL)/g;
  const parts   = [];
  let last = 0, m;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index), hi: false });
    const val = m[0];
    let color = '#FF5C4D';
    if (val === 'VERY HIGH') color = '#D64545';
    else if (val === 'HIGH')     color = '#E8A75D';
    else if (val === 'MODERATE') color = '#F59E0B';
    else if (val === 'LOW')      color = '#3B82F6';
    else if (val === 'NORMAL')   color = '#22C55E';
    parts.push({ t: val, hi: true, color });
    last = m.index + val.length;
  }
  if (last < text.length) parts.push({ t: text.slice(last), hi: false });
  return (
    <Text style={baseStyle}>
      {parts.map((p, i) =>
        p.hi
          ? <Text key={i} style={{ fontWeight: '700', color: p.color }}>{p.t}</Text>
          : <Text key={i}>{p.t}</Text>
      )}
    </Text>
  );
};

// ── Single insight section card ────────────────────────────────────────────────
const InsightSection = ({ section, index }) => {
  const [expanded, setExpanded] = useState(true);
  const { config, label, body } = section;
  const isLong = body.length > 180;
  return (
    <View style={[
      insightStyles.sectionCard,
      { borderLeftColor: config.color, backgroundColor: config.bg },
      index > 0 && { marginTop: 10 },
    ]}>
      <TouchableOpacity
        style={insightStyles.sectionHeader}
        onPress={() => isLong && setExpanded(e => !e)}
        activeOpacity={isLong ? 0.7 : 1}
      >
        <View style={[insightStyles.iconWrap, { backgroundColor: config.color + '22' }]}>
          <Ionicons name={config.icon} size={17} color={config.color} />
        </View>
        <Text style={[insightStyles.sectionLabel, { color: config.color }]}>{label}</Text>
        {isLong && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={15} color={config.color}
            style={{ marginLeft: 'auto' }}
          />
        )}
      </TouchableOpacity>
      {expanded
        ? <HighlightedText text={body} baseStyle={insightStyles.sectionBody} />
        : <Text style={[insightStyles.sectionBody, { color: '#9CA3AF' }]} numberOfLines={2}>{body}</Text>
      }
    </View>
  );
};

// ── PDF HTML builder ───────────────────────────────────────────────────────────
const buildPDFHtml = ({
  periodLabel, reportType, filtered, top3, carbonCounts,
  avgCO2Index, avgTemp, avgHumid, veryHighCount, trendUp, trendDiff,
  insightText, insightSnapshot,
}) => {
  const generatedAt  = new Date().toLocaleString();
  const totalSensors = filtered.length;

  const carbonRows = Object.entries(carbonCounts).map(([level, count]) => {
    const pct = totalSensors > 0 ? Math.round((count / totalSensors) * 100) : 0;
    const color = getCarbonColor(level);
    return `<tr>
      <td style="padding:8px 12px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:8px;"></span>${level}</td>
      <td style="padding:8px 12px;text-align:center;">${count}</td>
      <td style="padding:8px 12px;"><div style="background:#eee;border-radius:4px;height:8px;width:100%;"><div style="background:${color};width:${pct}%;height:8px;border-radius:4px;"></div></div></td>
      <td style="padding:8px 12px;text-align:right;">${pct}%</td>
    </tr>`;
  }).join('');

  const topRows = top3.map((loc, i) => {
    const color = getCarbonColor(loc.carbon_level);
    return `<tr>
      <td style="padding:8px 12px;text-align:center;font-weight:700;">${i + 1}</td>
      <td style="padding:8px 12px;">${loc.name}</td>
      <td style="padding:8px 12px;"><span style="background:${color};color:#fff;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">${loc.carbon_level || '—'}</span></td>
      <td style="padding:8px 12px;text-align:right;font-weight:700;">${loc.co2Display}</td>
    </tr>`;
  }).join('');

  const parsed = parseInsightText(insightText);
  const sectionColors = { STATUS:'#3B82F6', RESIDENTS:'#F59E0B', ALERT:'#D64545', RECOMMENDATION:'#10B981', FORECAST:'#8B5CF6' };
  let insightHtml = '';
  if (parsed) {
    insightHtml = parsed.map(s => {
      const color = sectionColors[s.key] || '#6B7280';
      return `<div style="border-left:4px solid ${color};border-radius:8px;padding:12px 16px;margin-bottom:12px;background:${color}11;">
        <div style="font-size:11px;font-weight:800;color:${color};letter-spacing:.6px;text-transform:uppercase;margin-bottom:6px;">${s.label}</div>
        <div style="font-size:13px;line-height:1.7;color:#374151;">${s.body}</div>
      </div>`;
    }).join('');
  } else {
    const bullets = [];
    if (top3[0]) bullets.push(`<li>${top3[0].name} has the highest carbon level${top3[0].carbon_level ? ` (${top3[0].carbon_level})` : ''} — priority inspection recommended.</li>`);
    if (top3[1]) bullets.push(`<li>${top3[1].name} is 2nd${top3[1].carbon_level ? ` at ${top3[1].carbon_level}` : ''}. Consider ventilation improvements.</li>`);
    if (veryHighCount > 0) bullets.push(`<li>${veryHighCount} sensor${veryHighCount > 1 ? 's' : ''} at VERY HIGH level — immediate action required.</li>`);
    bullets.push(`<li>Avg temperature ${avgTemp}°C, avg humidity ${avgHumid}% across ${totalSensors} active sensors.</li>`);
    insightHtml = `<ul>${bullets.join('\n')}</ul>`;
  }

  const snapshotMeta = insightSnapshot
    ? `<span class="meta-pill">Insight: ${new Date(insightSnapshot.minute_stamp).toLocaleString()}</span>` : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
  <style>
    body{font-family:-apple-system,sans-serif;margin:0;padding:0;color:#1F2937;background:#F9FAFB;}
    .page{max-width:800px;margin:0 auto;padding:40px 32px;}
    .header{background:linear-gradient(135deg,#FF5C4D,#ff8a7a);color:#fff;padding:32px;border-radius:16px;margin-bottom:24px;}
    .header h1{margin:0 0 4px;font-size:26px;}.header p{margin:0;opacity:.85;font-size:14px;}
    .meta-row{display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;}
    .meta-pill{background:rgba(255,255,255,.2);padding:4px 14px;border-radius:20px;font-size:12px;}
    .alert-box{background:#FEF2F2;border:1.5px solid #FECACA;border-radius:12px;padding:14px 18px;margin-bottom:20px;color:#B91C1C;font-weight:600;}
    .section{background:#fff;border-radius:14px;padding:24px;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,.06);}
    .section h2{margin:0 0 16px;font-size:17px;color:#111827;}
    .metrics{display:flex;gap:16px;flex-wrap:wrap;}
    .metric{flex:1;min-width:120px;background:#F9FAFB;border-radius:12px;padding:16px;text-align:center;}
    .metric .val{font-size:26px;font-weight:800;color:#FF5C4D;}.metric .lbl{font-size:12px;color:#6B7280;margin-top:4px;}
    table{width:100%;border-collapse:collapse;}
    th{background:#F3F4F6;padding:10px 12px;text-align:left;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px;}
    tr:nth-child(even){background:#FAFAFA;}
    ul{padding-left:20px;}li{margin-bottom:10px;line-height:1.6;font-size:14px;}
    .footer{text-align:center;font-size:11px;color:#9CA3AF;margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;}
  </style></head><body><div class="page">
    <div class="header">
      <h1>ENVI Analytics</h1>
      <p>Environmental Sensor Monitoring Report</p>
      <div class="meta-row">
        <span class="meta-pill">${periodLabel}</span>
        <span class="meta-pill">${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</span>
        <span class="meta-pill">Generated: ${generatedAt}</span>
        <span class="meta-pill">Total Sensors: ${totalSensors}</span>
        ${snapshotMeta}
      </div>
    </div>
    ${veryHighCount > 0 ? `<div class="alert-box">⚠️ ${veryHighCount} sensor${veryHighCount > 1 ? 's' : ''} at VERY HIGH carbon level — Immediate action required</div>` : ''}
    <div class="section"><h2>Summary Metrics</h2>
      <div class="metrics">
        <div class="metric"><div class="val">${avgCO2Index}</div><div class="lbl">Avg CO₂ Index</div></div>
        <div class="metric"><div class="val">${avgTemp}°C</div><div class="lbl">Avg Temperature</div></div>
        <div class="metric"><div class="val">${avgHumid}%</div><div class="lbl">Avg Humidity</div></div>
        <div class="metric"><div class="val" style="color:#D64545">${veryHighCount}</div><div class="lbl">Very High Alerts</div></div>
      </div>
    </div>
    <div class="section"><h2>Top Locations by Carbon Level</h2>
      <table><thead><tr><th>#</th><th>Location</th><th>Carbon Level</th><th>CO₂ Index</th></tr></thead>
      <tbody>${topRows || '<tr><td colspan="4" style="text-align:center;padding:16px;color:#9CA3AF;">No data available</td></tr>'}</tbody></table>
    </div>
    <div class="section"><h2>Carbon Level Breakdown</h2>
      <table><thead><tr><th>Level</th><th>Count</th><th>Distribution</th><th>%</th></tr></thead>
      <tbody>${carbonRows}</tbody></table>
    </div>
    <div class="section">
      <h2>Actionable Insights ${insightText ? '<span style="background:#FF5C4D;color:#fff;font-size:10px;padding:2px 7px;border-radius:6px;font-weight:800;vertical-align:middle;margin-left:6px;">AI</span>' : ''}</h2>
      ${insightHtml}
    </div>
    <div class="footer">ENVI Analytics — Auto-generated report · ${periodLabel} · ${reportType} · ${totalSensors} sensors monitored</div>
  </div></body></html>`;
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Reports() {
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]       = useState(false);
  const [downloading,     setDownloading]      = useState(false);
  const [sensorList,      setSensorList]       = useState([]);
  const [dataList,        setDataList]         = useState([]);
  const [earliestDate,    setEarliestDate]     = useState(null);
  const [reportType,      setReportType]       = useState('monthly');
  const [calendarVisible, setCalendarVisible]  = useState(false);
  const [selected,        setSelected]         = useState(null);
  const [insightText,     setInsightText]      = useState(null);
  const [insightSnapshot, setInsightSnapshot]  = useState(null);
  const [insightLoading,  setInsightLoading]   = useState(false);

  // ── Fetch AI insight ─────────────────────────────────────────────────────────
  const fetchInsight = async () => {
    try {
      setInsightLoading(true);
      const res  = await fetch(INSIGHT_API);
      const json = await res.json();
      const snapshots = json.snapshots || [];
      const latest = snapshots
        .filter(s => s.insight_text && s.llm_success)
        .sort((a, b) => new Date(b.minute_stamp) - new Date(a.minute_stamp))[0];
      if (latest) {
        setInsightText(latest.insight_text);
        setInsightSnapshot(latest);
      }
    } catch (err) {
      console.error('Insight fetch error:', err);
    } finally {
      setInsightLoading(false);
    }
  };

  // ── Fetch sensor data ────────────────────────────────────────────────────────
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

  useEffect(() => {
    fetchAllData(true);
    fetchInsight();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData(false);
    fetchInsight();
  };

  const handleReportTypeChange = (type) => {
    setReportType(type);
    if (selected) setSelected({ year: selected.year, month: selected.month });
  };

  // ── Filtered data ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!sensorList.length || !selected) return [];
    const sensorMap = {};
    sensorList.forEach(s => { sensorMap[s.sensor_id] = s; });

    const periodRecords = dataList.filter(d => {
      if (!d.recorded_at) return false;
      const dt = new Date(d.recorded_at);
      if (reportType === 'monthly') {
        return dt.getFullYear() === selected.year && dt.getMonth() === selected.month;
      }
      if (!selected.startDate || !selected.endDate) {
        return dt.getFullYear() === selected.year && dt.getMonth() === selected.month;
      }
      const start = new Date(selected.startDate); start.setHours(0, 0, 0, 0);
      const end   = new Date(selected.endDate);   end.setHours(23, 59, 59, 999);
      return dt >= start && dt <= end;
    });

    const latestMap = {};
    periodRecords.forEach(d => {
      const existing = latestMap[d.sensor_id];
      if (!existing || new Date(d.recorded_at) > new Date(existing.recorded_at)) {
        latestMap[d.sensor_id] = d;
      }
    });

    return Object.values(latestMap).map(d => ({
      ...(sensorMap[d.sensor_id] || {}),
      ...d,
    }));
  }, [sensorList, dataList, selected, reportType]);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const hasData = filtered.length > 0;

  const avgOf = (key) => {
    const valid = filtered.filter(s => s[key] != null && !isNaN(parseFloat(s[key])));
    if (!valid.length) return 0;
    return valid.reduce((s, x) => s + parseFloat(x[key]), 0) / valid.length;
  };

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

  const trendUp   = top3.length >= 2 ? top3[0].co2 > top3[1].co2 : false;
  const trendDiff = top3.length >= 2 && top3[1].co2 !== 0
    ? Math.abs(((top3[0].co2 - top3[1].co2) / top3[1].co2) * 100).toFixed(1) : '0';

  const chartData = {
    labels:   ['Normal', 'Low', 'Mod', 'High', 'V.High'],
    datasets: [{ data: [carbonCounts['NORMAL'], carbonCounts['LOW'], carbonCounts['MODERATE'], carbonCounts['HIGH'], carbonCounts['VERY HIGH']] }],
  };

  const periodLabel = !selected ? 'Loading…'
    : reportType === 'monthly'
      ? `${MONTHS[selected.month]} ${selected.year}`
      : selected.startDate && selected.endDate
        ? `${MONTHS[selected.month].slice(0, 3)} — Week ${selected.weekNum}`
        : `${MONTHS[selected.month]} ${selected.year}`;

  const veryHighCount = carbonCounts['VERY HIGH'];
  const avgTemp       = avgOf('temperature_c').toFixed(1);
  const avgHumid      = avgOf('humidity').toFixed(1);
  const parsedInsights = parseInsightText(insightText);

  const insightTimestamp = insightSnapshot
    ? new Date(insightSnapshot.minute_stamp).toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  // ── PDF download ─────────────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!hasData) {
      Alert.alert('No Data', 'There is no data to export for the selected period.');
      return;
    }
    try {
      setDownloading(true);
      const html = buildPDFHtml({
        periodLabel, reportType, filtered, top3, carbonCounts,
        avgCO2Index, avgTemp, avgHumid, veryHighCount, trendUp, trendDiff,
        insightText, insightSnapshot,
      });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `ENVI Report — ${periodLabel}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Report Saved', `PDF saved to:\n${uri}`);
      }
    } catch (err) {
      console.error('PDF export error:', err);
      Alert.alert('Export Failed', 'Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF5C4D" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reporting</Text>
        <TouchableOpacity
          onPress={handleDownload}
          style={[styles.downloadBtn, (!hasData || downloading) && styles.downloadBtnDisabled]}
          disabled={!hasData || downloading}
        >
          {downloading
            ? <ActivityIndicator size="small" color="#FF5C4D" />
            : <Ionicons name="download-outline" size={22} color="#FF5C4D" />
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Toggle */}
        <View style={styles.toggleContainer}>
          {[{ key: 'monthly', label: 'Monthly' }, { key: 'weekly', label: 'Weekly' }].map(({ key, label }) => (
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

        {/* Date selector */}
        <TouchableOpacity style={styles.dateCard} onPress={() => setCalendarVisible(true)}>
          <View style={styles.rowCenter}>
            <Ionicons name="calendar-outline" size={18} color="#FF5C4D" />
            <Text style={styles.dateText}>{periodLabel}</Text>
          </View>
          <Text style={styles.sensorCountSmall}>
            {hasData ? `${filtered.length} sensors` : 'No data'}
          </Text>
        </TouchableOpacity>

        {/* No data */}
        {!hasData ? (
          <View style={styles.noDataCard}>
            <MaterialCommunityIcons name="database-off-outline" size={48} color="#E5E7EB" />
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
            {/* Summary card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Carbon Emission Summary</Text>
              <View style={styles.summaryTopRow}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="molecule-co2" size={28} color="#10B981" />
                  <View style={styles.co2Badge}><Text style={styles.co2Text}>CO₂</Text></View>
                </View>
                <View style={styles.statsContainer}>
                  <Text style={styles.bigNumber}>{avgCO2Index}</Text>
                  <Text style={styles.unitText}>Avg CO₂ Index</Text>
                  <View style={styles.trendRow}>
                    <Ionicons
                      name={trendUp ? 'trending-up' : 'trending-down'}
                      size={16} color={trendUp ? '#EF4444' : '#10B981'}
                    />
                    <Text style={[styles.trendText, { color: trendUp ? '#EF4444' : '#10B981' }]}>
                      {trendDiff}% gap (#1 vs #2)
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.divider} />
              {top3.length === 0
                ? <Text style={styles.emptyText}>No barangay data</Text>
                : top3.map((loc, i) => (
                  <View key={i} style={styles.locationRow}>
                    <View>
                      <Text style={styles.locName}>{loc.name}</Text>
                      {loc.carbon_level && (
                        <Text style={[styles.locLevel, { color: getCarbonColor(loc.carbon_level) }]}>
                          {loc.carbon_level}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.locValue}>Index: {loc.co2Display}</Text>
                  </View>
                ))
              }
            </View>

            {/* Carbon level breakdown */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Carbon Level Breakdown</Text>
              <Text style={styles.cardSubtitle}>Sensor count — {periodLabel}</Text>
              {Object.entries(carbonCounts).map(([level, count]) => {
                const color = getCarbonColor(level);
                const pct   = filtered.length > 0 ? (count / filtered.length) * 100 : 0;
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

            {/* Bar chart */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Sensors per Carbon Level</Text>
              <Text style={styles.cardSubtitle}>{periodLabel}</Text>
              <View style={styles.chartContainer}>
                <BarChart
                  data={chartData}
                  width={screenWidth - 72}
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
              <View style={styles.insightHeaderRow}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#FF5C4D" />
                <Text style={[styles.cardTitle, { marginLeft: 8, flex: 1 }]}>Actionable Insights</Text>
                {insightText && (
                  <View style={insightStyles.aiBadge}>
                    <Text style={insightStyles.aiBadgeText}>AI</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardSubtitle, { marginLeft: 28 }]}>
                {insightTimestamp ? `Last updated ${insightTimestamp}` : periodLabel}
              </Text>

              {insightLoading ? (
                <View style={insightStyles.loadingRow}>
                  <ActivityIndicator size="small" color="#FF5C4D" />
                  <Text style={insightStyles.loadingLabel}>Fetching AI insights…</Text>
                </View>
              ) : parsedInsights ? (
                <View style={{ marginTop: 12 }}>
                  {parsedInsights.map((section, i) => (
                    <InsightSection key={section.key + i} section={section} index={i} />
                  ))}
                </View>
              ) : (
                <View style={styles.insightList}>
                  {top3[0] && (
                    <View style={styles.bulletRow}>
                      <View style={[styles.bulletDot, { backgroundColor: '#D64545' }]} />
                      <Text style={styles.insightText}>
                        <Text style={{ fontWeight: '700' }}>{top3[0].name}</Text> has the highest carbon level
                        {top3[0].carbon_level ? ` (${top3[0].carbon_level})` : ''} — priority inspection recommended.
                      </Text>
                    </View>
                  )}
                  {top3[1] && (
                    <View style={styles.bulletRow}>
                      <View style={[styles.bulletDot, { backgroundColor: '#E8A75D' }]} />
                      <Text style={styles.insightText}>
                        <Text style={{ fontWeight: '700' }}>{top3[1].name}</Text> is 2nd
                        {top3[1].carbon_level ? ` at ${top3[1].carbon_level}` : ''}. Consider ventilation improvements.
                      </Text>
                    </View>
                  )}
                  {veryHighCount > 0 && (
                    <View style={styles.bulletRow}>
                      <View style={[styles.bulletDot, { backgroundColor: '#D64545' }]} />
                      <Text style={styles.insightText}>
                        <Text style={{ fontWeight: '700' }}>{veryHighCount} sensor{veryHighCount > 1 ? 's' : ''}</Text>{' '}
                        at VERY HIGH level in {periodLabel} — immediate action required.
                      </Text>
                    </View>
                  )}
                  <View style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.insightText}>
                      Avg temperature <Text style={{ fontWeight: '700' }}>{avgTemp}°C</Text>,
                      avg humidity <Text style={{ fontWeight: '700' }}>{avgHumid}%</Text>{' '}
                      across {filtered.length} active sensors.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <CalendarPicker
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        mode={reportType}
        selected={selected}
        onSelect={setSelected}
        earliestDate={earliestDate || new Date().toISOString()}
      />
    </View>
  );
}

// ── Insight section styles ─────────────────────────────────────────────────────
const insightStyles = StyleSheet.create({
  aiBadge:      { backgroundColor: '#FF5C4D', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  aiBadgeText:  { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  sectionCard:  { borderLeftWidth: 4, borderRadius: 10, padding: 14, marginBottom: 10 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  iconWrap:     { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  sectionBody:  { fontSize: 13.5, lineHeight: 21, color: '#374151' },
  loadingRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 10 },
  loadingLabel: { fontSize: 13, color: '#9CA3AF' },
});

// ── Main styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#F8F9FA' },
  center:              { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:         { marginTop: 12, fontSize: 16, color: '#2D2D2D', fontWeight: '500' },
  header:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  headerTitle:         { fontSize: 24, fontWeight: '700', color: '#2D2D2D' },
  downloadBtn:         { padding: 10, borderRadius: 12, backgroundColor: '#FFF0EE' },
  downloadBtnDisabled: { opacity: 0.5 },
  toggleContainer:     { flexDirection: 'row', marginHorizontal: 20, marginTop: 20, gap: 12 },
  toggleButton:        { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
  toggleButtonActive:  { backgroundColor: '#FF5C4D', borderColor: '#FF5C4D' },
  toggleText:          { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  toggleTextActive:    { color: '#FFFFFF' },
  dateCard:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 16, padding: 14, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  dateText:            { fontSize: 15, fontWeight: '600', marginLeft: 10, color: '#2D2D2D' },
  sensorCountSmall:    { fontSize: 12, color: '#9CA3AF' },
  rowCenter:           { flexDirection: 'row', alignItems: 'center' },
  noDataCard:          { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 40, alignItems: 'center', marginHorizontal: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  noDataTitle:         { fontSize: 17, fontWeight: '700', color: '#2D2D2D', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  noDataSub:           { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  noDataBtn:           { backgroundColor: '#FF5C4D', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  noDataBtnText:       { color: '#fff', fontWeight: '700', fontSize: 14 },
  card:                { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 16, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle:           { fontSize: 17, fontWeight: '700', color: '#2D2D2D', marginBottom: 4 },
  cardSubtitle:        { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },
  emptyText:           { color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },
  summaryTopRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 16 },
  iconCircle:          { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 20, backgroundColor: '#F0FFF4' },
  co2Badge:            { position: 'absolute', bottom: 14 },
  co2Text:             { fontSize: 8, fontWeight: '700', color: '#10B981' },
  statsContainer:      { flex: 1 },
  bigNumber:           { fontSize: 24, fontWeight: '700', color: '#10B981' },
  unitText:            { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  trendRow:            { flexDirection: 'row', alignItems: 'center' },
  trendText:           { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  divider:             { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },
  locationRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  locName:             { fontSize: 14, color: '#2D2D2D', fontWeight: '600' },
  locLevel:            { fontSize: 10, fontWeight: '700', marginTop: 2 },
  locValue:            { fontSize: 13, fontWeight: '700', color: '#2D2D2D' },
  breakdownRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  breakdownLeft:       { flexDirection: 'row', alignItems: 'center', width: 110 },
  levelDot:            { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  breakdownLabel:      { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  barTrack:            { flex: 1, height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, marginHorizontal: 10, overflow: 'hidden' },
  barFill:             { height: '100%', borderRadius: 4 },
  breakdownCount:      { fontSize: 13, fontWeight: '700', color: '#1F2937', width: 24, textAlign: 'right' },
  chartContainer:      { alignItems: 'center', overflow: 'hidden', marginTop: 8 },
  insightHeaderRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  insightList:         { marginTop: 8 },
  bulletRow:           { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, paddingRight: 10, gap: 10 },
  bulletDot:           { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
  insightText:         { fontSize: 14, color: '#2D2D2D', flex: 1, lineHeight: 22 },
});