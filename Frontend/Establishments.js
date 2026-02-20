import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Modal, ScrollView, TextInput, Animated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SENSOR_API      = 'https://bytetech-final1.onrender.com/establishment';
const SENSOR_DATA_API = 'https://bytetech-final1.onrender.com/sensor-data';
const REFRESH_INTERVAL_MS = 30_000;

const previousValues = {};

// ─── Establishment type mapping (sensor_name → category) ────────────────────
const getEstablishmentMeta = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('mall') || n.includes('shop') || n.includes('store') || n.includes('market'))
    return { icon: 'storefront-outline', type: 'Shopping', color: '#7C3AED' };
  if (n.includes('resto') || n.includes('food') || n.includes('cafe') || n.includes('diner') || n.includes('kitchen'))
    return { icon: 'restaurant-outline', type: 'Dining', color: '#EA580C' };
  if (n.includes('school') || n.includes('univ') || n.includes('college') || n.includes('academy'))
    return { icon: 'school-outline', type: 'Education', color: '#0284C7' };
  if (n.includes('hospital') || n.includes('clinic') || n.includes('health') || n.includes('medical'))
    return { icon: 'medical-outline', type: 'Healthcare', color: '#DC2626' };
  if (n.includes('park') || n.includes('gym') || n.includes('sport') || n.includes('fitness'))
    return { icon: 'bicycle-outline', type: 'Recreation', color: '#16A34A' };
  if (n.includes('office') || n.includes('bldg') || n.includes('building') || n.includes('hub'))
    return { icon: 'business-outline', type: 'Office', color: '#0F766E' };
  if (n.includes('church') || n.includes('chapel') || n.includes('temple'))
    return { icon: 'globe-outline', type: 'Worship', color: '#B45309' };
  return { icon: 'location-outline', type: 'Establishment', color: '#6B7280' };
};

// ─── Safety level logic ───────────────────────────────────────────────────────
const getSafetyInfo = (level) => {
  switch ((level || '').toUpperCase()) {
    case 'VERY HIGH': return { label: 'Avoid Now', emoji: '🚫', bg: '#FEE2E2', fg: '#991B1B', safe: false, advice: 'CO₂ is dangerously high. Please avoid this establishment.' };
    case 'HIGH':      return { label: 'Use Caution', emoji: '⚠️', bg: '#FEF3C7', fg: '#92400E', safe: false, advice: 'Elevated CO₂ detected. Consider limiting your visit or waiting.' };
    case 'MODERATE':  return { label: 'Acceptable', emoji: '🟡', bg: '#FEF9C3', fg: '#713F12', safe: true, advice: 'CO₂ is moderate. Short visits are fine — ensure good ventilation.' };
    case 'LOW':       return { label: 'Good to Go', emoji: '✅', bg: '#DCFCE7', fg: '#14532D', safe: true, advice: 'Air quality is good. Safe to visit!' };
    default:          return { label: 'Good to Go', emoji: '✅', bg: '#DCFCE7', fg: '#14532D', safe: true, advice: 'Air quality is within normal range. Enjoy your visit!' };
  }
};

// ─── Time-of-day greeting & recommendation context ───────────────────────────
const getTimeContext = () => {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { greeting: 'Good Morning', tip: 'Best time to visit indoor spaces — air is typically fresher in the morning.', icon: '🌅' };
  if (h >= 12 && h < 14) return { greeting: 'Good Noon',    tip: 'Lunch rush hours can raise CO₂ in dining areas. Check levels before heading in.', icon: '☀️' };
  if (h >= 14 && h < 18) return { greeting: 'Good Afternoon', tip: 'Afternoon foot traffic peaks. Prefer establishments with LOW or NORMAL readings.', icon: '🌤' };
  if (h >= 18 && h < 21) return { greeting: 'Good Evening', tip: 'Evening crowds are rising. Prioritize well-ventilated spaces.', icon: '🌆' };
  return { greeting: 'Good Night', tip: 'Late hours. Most indoor spaces have lower occupancy — check live readings before visiting.', icon: '🌙' };
};

const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
};

// ─── Format timestamp to hour (e.g. 6:00 AM) ────────────────────────────────
const formatTimestampHour = (timestamp) => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

// ─── Live Pulse ───────────────────────────────────────────────────────────────
const LivePulse = ({ countdown }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1.7, duration: 900, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1,   duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={s.liveRow}>
      <View style={s.pulseWrap}>
        <Animated.View style={[s.pulseRing, { transform: [{ scale: anim }] }]} />
        <View style={s.pulseDot} />
      </View>
      <Text style={s.liveLabel}>LIVE</Text>
      <Text style={s.liveTimer}>{countdown}s</Text>
    </View>
  );
};

// ─── Safety Badge ─────────────────────────────────────────────────────────────
const SafetyBadge = ({ level, compact = false }) => {
  const info = getSafetyInfo(level);
  if (compact) return (
    <View style={[s.badgeCompact, { backgroundColor: info.bg }]}>
      <Text style={{ fontSize: 10 }}>{info.emoji}</Text>
      <Text style={[s.badgeCompactText, { color: info.fg }]}>{info.label}</Text>
    </View>
  );
  return (
    <View style={[s.badge, { backgroundColor: info.bg }]}>
      <Text style={[s.badgeText, { color: info.fg }]}>{info.emoji}  {info.label}</Text>
    </View>
  );
};

// ─── Establishment Card ───────────────────────────────────────────────────────
const EstCard = ({ item, onPress, pct }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const meta  = getEstablishmentMeta(item.sensor_name || item.barangay_name);
  const safe  = getSafetyInfo(item.carbon_level);
  const co2   = parseFloat(item.co2_density) || 0;
  const isUp  = pct > 0;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[s.card, { borderLeftColor: meta.color }]}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
        activeOpacity={1}
      >
        {/* Safe / Unsafe indicator strip */}
        <View style={[s.safeStrip, { backgroundColor: safe.safe ? '#22C55E' : '#EF4444' }]} />

        {/* Icon */}
        <View style={[s.iconBox, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon} size={24} color={meta.color} />
        </View>

        <View style={s.cardBody}>
          <View style={s.cardTop}>
            <Text style={s.cardName} numberOfLines={1}>{item.sensor_name || 'Unknown Establishment'}</Text>
            <SafetyBadge level={item.carbon_level} compact />
          </View>

          <Text style={s.cardBarangay} numberOfLines={1}>
            <Ionicons name="location-outline" size={11} color="#9CA3AF" /> {item.barangay_name || 'Location unknown'}
          </Text>

          <View style={s.cardMeta}>
            <View style={s.metaChip}>
              <Ionicons name="storefront-outline" size={11} color={meta.color} />
              <Text style={[s.metaChipText, { color: meta.color }]}>{meta.type}</Text>
            </View>
            <View style={s.metaChip}>
              <MaterialCommunityIcons name="molecule-co2" size={11} color="#6B7280" />
              <Text style={s.metaChipGray}>{co2} ppm</Text>
            </View>
            {item.temperature_c != null && (
              <View style={s.metaChip}>
                <Ionicons name="thermometer-outline" size={11} color="#6B7280" />
                <Text style={s.metaChipGray}>{item.temperature_c}°C</Text>
              </View>
            )}
            {pct !== 0 && (
              <View style={s.metaChip}>
                <Ionicons name={isUp ? 'trending-up' : 'trending-down'} size={11} color={isUp ? '#DC2626' : '#16A34A'} />
                <Text style={[s.metaChipText, { color: isUp ? '#DC2626' : '#16A34A' }]}>{Math.abs(pct)}%</Text>
              </View>
            )}
            {/* ── Timestamp hour chip ─────────────────────────────────── */}
            {(item.timestamp || item.recorded_at) && (() => {
              const timeLabel = formatTimestampHour(item.timestamp || item.recorded_at);
              return timeLabel ? (
                <View style={s.metaChip}>
                  <Ionicons name="time-outline" size={11} color="#6B7280" />
                  <Text style={s.metaChipGray}>{timeLabel}</Text>
                </View>
              ) : null;
            })()}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PlacesScreen() {
  const [mergedList,     setMergedList]     = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [pctChanges,     setPctChanges]     = useState({});
  const [lastUpdated,    setLastUpdated]    = useState(null);
  const [countdown,      setCountdown]      = useState(REFRESH_INTERVAL_MS / 1000);

  const [selected,       setSelected]       = useState(null);
  const [detailVisible,  setDetailVisible]  = useState(false);
  const [filterVisible,  setFilterVisible]  = useState(false);
  const [filterName,     setFilterName]     = useState('');
  const [filterLevel,    setFilterLevel]    = useState('');
  const [safeOnly,       setSafeOnly]       = useState(false);

  const [activeTab,      setActiveTab]      = useState('all');

  const intervalRef  = useRef(null);
  const countdownRef = useRef(null);
  const timeCtx      = getTimeContext();

  const fetchAll = async (initial = false) => {
    try {
      if (initial) setLoading(true);
      const [sRes, dRes] = await Promise.all([fetch(SENSOR_API), fetch(SENSOR_DATA_API)]);
      const sensors = await sRes.json();
      const dJson   = await dRes.json();
      const dataArr = Array.isArray(dJson) ? dJson : (dJson.data || []);

      const dataMap = {};
      dataArr.forEach(d => { dataMap[d.sensor_id] = d; });

      const merged = (Array.isArray(sensors) ? sensors : []).map(s => ({
        ...s, ...(dataMap[s.sensor_id] || {}),
      }));

      const changes = {};
      merged.forEach(item => {
        const key  = `s-${item.sensor_id}`;
        const curr = parseFloat(item.co2_density) || 0;
        changes[key] = previousValues[key] ? calculatePercentageChange(curr, previousValues[key]) : 0;
        previousValues[key] = curr;
      });

      setPctChanges(changes);
      setMergedList(merged);
      applyFilters(merged, filterName, filterLevel, activeTab);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (list, name, level, tab) => {
    let result = list;
    if (name)  result = result.filter(i => (i.sensor_name || '').toLowerCase().includes(name.toLowerCase()) || (i.barangay_name || '').toLowerCase().includes(name.toLowerCase()));
    if (level) result = result.filter(i => (i.carbon_level || '').toLowerCase().includes(level.toLowerCase()));
    if (tab === 'safe')    result = result.filter(i => ['NORMAL', 'LOW', 'MODERATE'].includes((i.carbon_level || '').toUpperCase()));
    if (tab === 'caution') result = result.filter(i => (i.carbon_level || '').toUpperCase() === 'HIGH');
    if (tab === 'avoid')   result = result.filter(i => (i.carbon_level || '').toUpperCase() === 'VERY HIGH');
    setFiltered(result);
  };

  const startCycle = () => {
    clearInterval(intervalRef.current);
    clearInterval(countdownRef.current);
    setCountdown(REFRESH_INTERVAL_MS / 1000);
    countdownRef.current = setInterval(() => setCountdown(p => p <= 1 ? REFRESH_INTERVAL_MS / 1000 : p - 1), 1000);
    intervalRef.current  = setInterval(() => { fetchAll(false); setCountdown(REFRESH_INTERVAL_MS / 1000); }, REFRESH_INTERVAL_MS);
  };

  useEffect(() => {
    fetchAll(true);
    startCycle();
    return () => { clearInterval(intervalRef.current); clearInterval(countdownRef.current); };
  }, []);

  useEffect(() => {
    applyFilters(mergedList, filterName, filterLevel, activeTab);
  }, [activeTab]);

  const onRefresh = () => { setRefreshing(true); fetchAll(false); startCycle(); };

  const safeCount   = mergedList.filter(i => getSafetyInfo(i.carbon_level).safe).length;
  const unsafeCount = mergedList.length - safeCount;

  const TABS = [
    { id: 'all',     label: 'All',        count: mergedList.length },
    { id: 'safe',    label: '✅ Safe',    count: safeCount },
    { id: 'caution', label: '⚠️ Caution', count: mergedList.filter(i => (i.carbon_level || '').toUpperCase() === 'HIGH').length },
    { id: 'avoid',   label: '🚫 Avoid',   count: unsafeCount - mergedList.filter(i => (i.carbon_level || '').toUpperCase() === 'HIGH').length },
  ];

  return (
    <SafeAreaView style={s.root}>

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.timeIcon}>{timeCtx.icon}</Text>
            <Text style={s.greeting}>{timeCtx.greeting}</Text>
            <Text style={s.headerSub}>Find safe establishments near you</Text>
          </View>
          <View style={s.headerActions}>
            {!loading && <LivePulse countdown={countdown} />}
            <TouchableOpacity style={s.filterBtn} onPress={() => setFilterVisible(true)}>
              <Ionicons name="options-outline" size={20} color="#FFF" />
              {(filterName || filterLevel) && <View style={s.filterDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Time-based tip */}
        <View style={s.tipBox}>
          <Ionicons name="bulb-outline" size={14} color="#FCD34D" />
          <Text style={s.tipText}>{timeCtx.tip}</Text>
        </View>

        {/* Summary chips */}
        <View style={s.summaryRow}>
          <View style={[s.summaryChip, { backgroundColor: '#22C55E20' }]}>
            <Text style={[s.summaryNum, { color: '#22C55E' }]}>{safeCount}</Text>
            <Text style={s.summaryLbl}>Safe</Text>
          </View>
          <View style={[s.summaryChip, { backgroundColor: '#EF444420' }]}>
            <Text style={[s.summaryNum, { color: '#EF4444' }]}>{unsafeCount}</Text>
            <Text style={s.summaryLbl}>Caution</Text>
          </View>
          <View style={[s.summaryChip, { backgroundColor: '#FFFFFF10' }]}>
            <Text style={[s.summaryNum, { color: '#94A3B8' }]}>{mergedList.length}</Text>
            <Text style={s.summaryLbl}>Total</Text>
          </View>
          {lastUpdated && (
            <Text style={s.updatedText}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <View style={s.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[s.tab, activeTab === t.id && s.tabActive]}
              onPress={() => setActiveTab(t.id)}
            >
              <Text style={[s.tabText, activeTab === t.id && s.tabTextActive]}>
                {t.label}
              </Text>
              <View style={[s.tabCount, activeTab === t.id && s.tabCountActive]}>
                <Text style={[s.tabCountText, activeTab === t.id && { color: '#0F172A' }]}>{t.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ─── List ────────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={s.loadingTxt}>Loading establishments…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => `s-${item.sensor_id ?? i}`}
          renderItem={({ item }) => (
            <EstCard
              item={item}
              onPress={() => { setSelected(item); setDetailVisible(true); }}
              pct={pctChanges[`s-${item.sensor_id}`] || 0}
            />
          )}
          contentContainerStyle={s.listPad}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <Text style={{ fontSize: 48 }}>🏙️</Text>
              <Text style={s.emptyTitle}>No establishments found</Text>
              <Text style={s.emptySub}>
                {filterName || filterLevel ? 'Try adjusting your filters' : 'Pull down to refresh'}
              </Text>
              {(filterName || filterLevel) && (
                <TouchableOpacity style={s.clearBtn} onPress={() => { setFilterName(''); setFilterLevel(''); applyFilters(mergedList, '', '', activeTab); }}>
                  <Text style={s.clearBtnTxt}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {/* ─── Detail Modal ────────────────────────────────────────────────── */}
      <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            {selected && (() => {
              const meta  = getEstablishmentMeta(selected.sensor_name || '');
              const safe  = getSafetyInfo(selected.carbon_level);
              const pct   = pctChanges[`s-${selected.sensor_id}`] || 0;
              return (
                <>
                  {/* Modal header */}
                  <LinearGradient colors={['#0F172A', '#1E3A5F']} style={s.sheetHeader}>
                    <TouchableOpacity style={s.closeBtn} onPress={() => setDetailVisible(false)}>
                      <Ionicons name="chevron-down" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={[s.sheetIcon, { backgroundColor: meta.color + '30' }]}>
                      <Ionicons name={meta.icon} size={32} color={meta.color} />
                    </View>
                    <Text style={s.sheetName}>{selected.sensor_name || 'Establishment'}</Text>
                    <Text style={s.sheetBarangay}>{selected.barangay_name || ''}</Text>
                    <View style={[s.safeBadgeLarge, { backgroundColor: safe.bg }]}>
                      <Text style={{ fontSize: 16 }}>{safe.emoji}</Text>
                      <Text style={[s.safeBadgeLargeTxt, { color: safe.fg }]}>{safe.label}</Text>
                    </View>
                  </LinearGradient>

                  <ScrollView style={s.sheetScroll} showsVerticalScrollIndicator={false}>
                    {/* Advice box */}
                    <View style={[s.adviceBox, { backgroundColor: safe.bg, borderColor: safe.fg + '30' }]}>
                      <Ionicons name="information-circle-outline" size={20} color={safe.fg} />
                      <Text style={[s.adviceTxt, { color: safe.fg }]}>{safe.advice}</Text>
                    </View>

                    {/* Quick stats */}
                    <View style={s.quickStats}>
                      {[
                        { label: 'CO₂', value: selected.co2_density ? `${selected.co2_density} ppm` : 'N/A', icon: 'cloud-outline' },
                        { label: 'Temp', value: selected.temperature_c ? `${selected.temperature_c}°C` : 'N/A', icon: 'thermometer-outline' },
                        { label: 'Humidity', value: selected.humidity ? `${parseFloat(selected.humidity).toFixed(0)}%` : 'N/A', icon: 'water-outline' },
                      ].map((stat, i) => (
                        <View key={i} style={s.qsCard}>
                          <Ionicons name={stat.icon} size={18} color="#3B82F6" />
                          <Text style={s.qsVal}>{stat.value}</Text>
                          <Text style={s.qsLbl}>{stat.label}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Trend */}
                    {pct !== 0 && (
                      <View style={[s.trendBox, { backgroundColor: pct > 0 ? '#FEF2F1' : '#F0FDF4' }]}>
                        <Ionicons name={pct > 0 ? 'trending-up' : 'trending-down'} size={18} color={pct > 0 ? '#DC2626' : '#16A34A'} />
                        <Text style={[s.trendTxt, { color: pct > 0 ? '#DC2626' : '#16A34A' }]}>
                          CO₂ has {pct > 0 ? 'increased' : 'decreased'} by {Math.abs(pct)}% since the last reading.
                        </Text>
                      </View>
                    )}

                    {/* Info rows */}
                    <View style={s.infoSection}>
                      <Text style={s.infoSectionTitle}>Details</Text>
                      {[
                        { icon: 'hardware-chip-outline', label: 'Sensor ID', value: selected.sensor_id },
                        { icon: 'business-outline',      label: 'Type',      value: meta.type },
                        { icon: 'warning-outline',       label: 'Air Level', value: selected.carbon_level },
                        { icon: 'location-outline',      label: 'Barangay',  value: selected.barangay_name },
                        { icon: 'time-outline',          label: 'Last Read', value: selected.timestamp || selected.recorded_at },
                      ].filter(r => r.value).map((row, i) => (
                        <View key={i} style={s.infoRow}>
                          <View style={s.infoIconBox}>
                            <Ionicons name={row.icon} size={16} color="#3B82F6" />
                          </View>
                          <View>
                            <Text style={s.infoLbl}>{row.label}</Text>
                            <Text style={s.infoVal}>{row.value}</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {/* Best time hint */}
                    <View style={s.bestTimeBox}>
                      <Text style={s.bestTimeTitle}>💡 Visiting Tip</Text>
                      <Text style={s.bestTimeTxt}>
                        {safe.safe
                          ? `Great news — this spot is currently safe to visit. ${timeCtx.tip}`
                          : `We suggest waiting or choosing a nearby establishment with lower CO₂. ${timeCtx.tip}`}
                      </Text>
                    </View>
                    <View style={{ height: 32 }} />
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ─── Filter Modal ────────────────────────────────────────────────── */}
      <Modal visible={filterVisible} animationType="slide" transparent onRequestClose={() => setFilterVisible(false)}>
        <View style={s.overlay}>
          <View style={[s.sheet, { maxHeight: '55%' }]}>
            <View style={s.filterHeader}>
              <Text style={s.filterTitle}>Filter Establishments</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}>
                <Ionicons name="close" size={22} color="#2D2D2D" />
              </TouchableOpacity>
            </View>
            <View style={s.filterBody}>
              <Text style={s.filterLbl}>Establishment / Barangay Name</Text>
              <TextInput
                style={s.filterInput}
                placeholder="e.g. SM Mall, Barangay Uno…"
                value={filterName}
                onChangeText={setFilterName}
                placeholderTextColor="#9CA3AF"
              />
              <Text style={[s.filterLbl, { marginTop: 16 }]}>Carbon Level</Text>
              <TextInput
                style={s.filterInput}
                placeholder="e.g. Low, High, Moderate…"
                value={filterLevel}
                onChangeText={setFilterLevel}
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity style={s.applyBtn} onPress={() => { applyFilters(mergedList, filterName, filterLevel, activeTab); setFilterVisible(false); }}>
                <LinearGradient colors={['#1D4ED8', '#3B82F6']} style={s.applyGrad}>
                  <Text style={s.applyTxt}>Apply Filters</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={s.resetBtn} onPress={() => { setFilterName(''); setFilterLevel(''); applyFilters(mergedList, '', '', activeTab); setFilterVisible(false); }}>
                <Text style={s.resetTxt}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#F1F5F9' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingTxt:   { fontSize: 14, color: '#64748B', marginTop: 8 },

  // Header
  header:       { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  timeIcon:     { fontSize: 28, marginBottom: 2 },
  greeting:     { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub:    { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  headerActions:{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  filterBtn:    { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  filterDot:    { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' },

  // Live
  liveRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  pulseWrap:    { width: 10, height: 10, justifyContent: 'center', alignItems: 'center' },
  pulseDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', position: 'absolute' },
  pulseRing:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', opacity: 0.35 },
  liveLabel:    { fontSize: 10, fontWeight: '800', color: '#22C55E', letterSpacing: 0.8 },
  liveTimer:    { fontSize: 10, color: '#94A3B8' },

  // Tip
  tipBox:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(252,211,77,0.12)', padding: 10, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(252,211,77,0.2)' },
  tipText:      { flex: 1, fontSize: 11, color: '#FCD34D', lineHeight: 16 },

  // Summary
  summaryRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryChip:  { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  summaryNum:   { fontSize: 18, fontWeight: '800' },
  summaryLbl:   { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  updatedText:  { flex: 1, textAlign: 'right', fontSize: 10, color: '#475569' },

  // Tabs
  tabsWrap:     { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabs:         { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', gap: 6 },
  tabActive:    { backgroundColor: '#0F172A' },
  tabText:      { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive:{ color: '#FFFFFF' },
  tabCount:     { backgroundColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  tabCountActive:{ backgroundColor: '#FFFFFF30' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: '#475569' },

  // List
  listPad: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },

  // Card
  card:         { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, alignItems: 'center', marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  safeStrip:    { position: 'absolute', top: 0, right: 0, width: 4, height: '100%' },
  iconBox:      { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardBody:     { flex: 1, marginLeft: 12 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  cardName:     { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B', marginRight: 8 },
  cardBarangay: { fontSize: 11, color: '#9CA3AF', marginBottom: 6 },
  cardMeta:     { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaChip:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F8FAFC', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  metaChipText: { fontSize: 10, fontWeight: '700' },
  metaChipGray: { fontSize: 10, color: '#6B7280', fontWeight: '500' },

  // Badge
  badgeCompact:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeCompactText: { fontSize: 10, fontWeight: '700' },
  badge:            { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText:        { fontSize: 12, fontWeight: '700' },

  // Empty
  empty:      { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 12 },
  emptySub:   { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  clearBtn:   { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0F172A' },
  clearBtnTxt:{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // Modal / Sheet
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', overflow: 'hidden' },
  sheetHeader:{ paddingTop: 20, paddingBottom: 24, paddingHorizontal: 24, alignItems: 'center' },
  closeBtn:   { alignSelf: 'flex-start', padding: 4, marginBottom: 12 },
  sheetIcon:  { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  sheetName:  { fontSize: 22, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.4 },
  sheetBarangay: { fontSize: 13, color: '#94A3B8', marginTop: 3, marginBottom: 14, textAlign: 'center' },
  safeBadgeLarge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 16 },
  safeBadgeLargeTxt: { fontSize: 14, fontWeight: '800' },
  sheetScroll:{ paddingHorizontal: 24 },

  // Advice
  adviceBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 20, marginBottom: 20 },
  adviceTxt:  { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 20 },

  // Quick Stats
  quickStats: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  qsCard:     { flex: 1, backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14, alignItems: 'center', gap: 5 },
  qsVal:      { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  qsLbl:      { fontSize: 10, color: '#94A3B8', textAlign: 'center' },

  // Trend
  trendBox:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginBottom: 20 },
  trendTxt:   { flex: 1, fontSize: 13, fontWeight: '600' },

  // Info section
  infoSection:      { marginBottom: 20 },
  infoSectionTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  infoRow:          { flexDirection: 'row', alignItems: 'center', paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIconBox:      { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLbl:          { fontSize: 11, color: '#94A3B8', marginBottom: 2, fontWeight: '600' },
  infoVal:          { fontSize: 14, color: '#1E293B', fontWeight: '600' },

  // Best time
  bestTimeBox:  { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 10 },
  bestTimeTitle:{ fontSize: 14, fontWeight: '800', color: '#14532D', marginBottom: 6 },
  bestTimeTxt:  { fontSize: 13, color: '#166534', lineHeight: 20 },

  // Filter
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterTitle:  { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  filterBody:   { padding: 24 },
  filterLbl:    { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  filterInput:  { borderWidth: 2, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, fontSize: 15, backgroundColor: '#F8FAFC', color: '#1E293B', fontWeight: '500' },
  applyBtn:     { borderRadius: 14, overflow: 'hidden', marginTop: 24 },
  applyGrad:    { padding: 16, alignItems: 'center' },
  applyTxt:     { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  resetBtn:     { padding: 14, alignItems: 'center', marginTop: 10 },
  resetTxt:     { color: '#64748B', fontWeight: '700', fontSize: 15 },
});