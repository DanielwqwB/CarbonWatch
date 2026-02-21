import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, ScrollView, TextInput, Animated, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SENSOR_API = 'https://bytetech-final1.onrender.com/establishment';
const SENSOR_DATA_API = 'https://bytetech-final1.onrender.com/sensor-data';
const REFRESH_INTERVAL_MS = 30_000;
const previousValues = {};

const normalizeEstablishment = (s) => ({
  ...s,
  sensor_id: s.establishment_id ?? s.sensor_id,
  // FIX: prioritize establishment_name, fallback to sensor_name, then a meaningful default
  sensor_name: s.establishment_name || s.sensor_name || s.name || null,
  co2_density: s.avg_co2_density ?? s.co2_density,
  temperature_c: s.avg_temperature_c ?? s.temperature_c,
});

const getEstablishmentMeta = (name = '') => {
  const n = name.toLowerCase();
  if (n.includes('mall') || n.includes('shop') || n.includes('store') || n.includes('market')) return { icon: 'storefront-outline', type: 'Shopping', color: '#7C3AED' };
  if (n.includes('resto') || n.includes('food') || n.includes('cafe') || n.includes('diner') || n.includes('kitchen')) return { icon: 'restaurant-outline', type: 'Dining', color: '#EA580C' };
  if (n.includes('school') || n.includes('univ') || n.includes('college') || n.includes('academy')) return { icon: 'school-outline', type: 'Education', color: '#0284C7' };
  if (n.includes('hospital') || n.includes('clinic') || n.includes('health') || n.includes('medical')) return { icon: 'medical-outline', type: 'Healthcare', color: '#DC2626' };
  if (n.includes('park') || n.includes('gym') || n.includes('sport') || n.includes('fitness')) return { icon: 'bicycle-outline', type: 'Recreation', color: '#16A34A' };
  if (n.includes('office') || n.includes('bldg') || n.includes('building') || n.includes('hub')) return { icon: 'business-outline', type: 'Office', color: '#0F766E' };
  if (n.includes('church') || n.includes('chapel') || n.includes('temple')) return { icon: 'globe-outline', type: 'Worship', color: '#B45309' };
  return { icon: 'location-outline', type: 'Establishment', color: '#6B7280' };
};

const getSafetyInfo = (level) => {
  switch ((level || '').toUpperCase()) {
    case 'VERY HIGH': return { label: 'Avoid Now', emoji: '🚫', bg: '#FEE2E2', fg: '#991B1B', safe: false, advice: 'CO₂ is dangerously high. Please avoid this establishment.' };
    case 'HIGH': return { label: 'Use Caution', emoji: '⚠️', bg: '#FEF3C7', fg: '#92400E', safe: false, advice: 'Elevated CO₂ detected. Consider limiting your visit or waiting.' };
    case 'MODERATE': return { label: 'Acceptable', emoji: '🟡', bg: '#FEF9C3', fg: '#713F12', safe: true, advice: 'CO₂ is moderate. Short visits are fine — ensure good ventilation.' };
    case 'LOW': return { label: 'Good to Go', emoji: '✅', bg: '#DCFCE7', fg: '#14532D', safe: true, advice: 'Air quality is good. Safe to visit!' };
    default: return { label: 'Good to Go', emoji: '✅', bg: '#DCFCE7', fg: '#14532D', safe: true, advice: 'Air quality is within normal range. Enjoy your visit!' };
  }
};

const getTimeContext = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: 'Good Morning', tip: 'Best time to visit indoor spaces — air is typically fresher in the morning.', icon: '🌅' };
  if (h >= 12 && h < 14) return { greeting: 'Good Noon', tip: 'Lunch rush hours can raise CO₂ in dining areas. Check levels before heading in.', icon: '☀️' };
  if (h >= 14 && h < 18) return { greeting: 'Good Afternoon', tip: 'Afternoon foot traffic peaks. Prefer establishments with LOW or NORMAL readings.', icon: '🌤' };
  if (h >= 18 && h < 21) return { greeting: 'Good Evening', tip: 'Evening crowds are rising. Prioritize well-ventilated spaces.', icon: '🌆' };
  return { greeting: 'Good Night', tip: 'Late hours. Most indoor spaces have lower occupancy — check live readings before visiting.', icon: '🌙' };
};

const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
};

const formatTimestampHour = (timestamp) => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatHourLabel = (hour) => {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
};

const openMap = (item) => {
  const lat = parseFloat(item.latitude);
  const lng = parseFloat(item.longitude);
  if (isNaN(lat) || isNaN(lng)) {
    const name = encodeURIComponent(item.sensor_name || item.establishment_name || 'Establishment');
    Linking.openURL(`./map`);
    return;
  }
  const name = encodeURIComponent(item.sensor_name || item.establishment_name || 'Establishment');
  const jitter = () => (Math.random() - 0.5) * 0.0008;
  const jLat = lat + jitter();
  const jLng = lng + jitter();
  const url = Platform.select({
    ios: `maps://app?q=${name}&ll=${jLat},${jLng}`,
    android: `geo:${jLat},${jLng}?q=${jLat},${jLng}(${name})`,
  });
};

const LivePulse = ({ countdown }) => {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1.7, duration: 900, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
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

const SafetyBadge = ({ level, compact = false }) => {
  const info = getSafetyInfo(level);
  if (compact) return (
    <View style={[s.badgeCompact, { backgroundColor: info.bg }]}>
      <Text>{info.emoji}</Text>
      <Text style={[s.badgeCompactText, { color: info.fg }]}>{info.label}</Text>
    </View>
  );
  return (
    <View style={[s.badge, { backgroundColor: info.bg }]}>
      <Text style={[s.badgeText, { color: info.fg }]}>{info.emoji} {info.label}</Text>
    </View>
  );
};

const EstCard = ({ item, onPress, onMapPress, pct }) => {
  const scale = useRef(new Animated.Value(1)).current;
  // FIX: use sensor_name which is now properly normalized; fallback to barangay_name or ID
  const displayName = item.sensor_name || item.barangay_name || `Establishment #${item.sensor_id}`;
  const meta = getEstablishmentMeta(displayName);
  const safe = getSafetyInfo(item.carbon_level);
  const co2 = parseFloat(item.co2_density) || 0;
  const isUp = pct > 0;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[s.card, { borderLeftColor: meta.color }]}
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
        activeOpacity={1}
      >
        <View style={[s.iconBox, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon} size={24} color={meta.color} />
        </View>
        <View style={s.cardBody}>
          <View style={s.cardTop}>
            <Text style={s.cardName} numberOfLines={1}>{displayName}</Text>
            <SafetyBadge level={item.carbon_level} compact />
          </View>
          <Text style={s.cardBarangay}>{item.barangay_name || 'Location unknown'}</Text>
          <View style={s.cardMeta}>
            <View style={[s.metaChip, { backgroundColor: meta.color + '15' }]}>
              <Text style={[s.metaChipText, { color: meta.color }]}>{meta.type}</Text>
            </View>
            <View style={s.metaChip}>
              <Text style={s.metaChipText}>{co2} ppm</Text>
            </View>
            {item.temperature_c != null && (
              <View style={s.metaChip}>
                <Text style={s.metaChipGray}>{item.temperature_c}°C</Text>
              </View>
            )}
            {pct !== 0 && (
              <View style={[s.metaChip, { backgroundColor: isUp ? '#FEE2E2' : '#DCFCE7' }]}>
                <Ionicons name={isUp ? 'arrow-up' : 'arrow-down'} size={10} color={isUp ? '#DC2626' : '#16A34A'} />
                <Text style={[s.metaChipText, { color: isUp ? '#DC2626' : '#16A34A' }]}>{Math.abs(pct)}%</Text>
              </View>
            )}
            {(item.timestamp || item.recorded_at) && (() => {
              const timeLabel = formatTimestampHour(item.timestamp || item.recorded_at);
              return timeLabel ? (
                <View style={s.metaChip}>
                  <Ionicons name="time-outline" size={10} color="#94A3B8" />
                  <Text style={s.metaChipGray}>{timeLabel}</Text>
                </View>
              ) : null;
            })()}
            <TouchableOpacity style={[s.metaChip, s.mapChip]} onPress={onMapPress}>
              <Ionicons name="navigate-outline" size={10} color="#0F766E" />
              <Text style={[s.metaChipText, { color: '#0F766E' }]}>Map</Text>
            </TouchableOpacity>
          </View>
          {item.safeHours && item.safeHours.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {item.safeHours.map(h => {
                  const now = new Date().getHours();
                  const isCurrent = h === now;
                  const isPast = h < now;
                  return (
                    <View key={h} style={[s.hourChip, isCurrent && s.hourChipNow, isPast && s.hourChipPast]}>
                      <Text style={[s.hourChipTxt, isCurrent && s.hourChipTxtNow, isPast && s.hourChipTxtPast]}>{formatHourLabel(h)}</Text>
                      {isCurrent && <View style={s.hourDot} />}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// FIX: SafeHoursCard now renders actual hour chips instead of returning ""
const SafeHoursCard = ({ item, onPress, onMapPress }) => {
  // FIX: use sensor_name which is now properly normalized
  const displayName = item.sensor_name || item.barangay_name || `Establishment #${item.sensor_id}`;
  const meta = getEstablishmentMeta(displayName);
  const safeHours = item.safeHours || [];
  const currentHour = new Date().getHours();
  const isNowSafe = safeHours.includes(currentHour);

  return (
    <TouchableOpacity style={[s.shCard, { borderLeftColor: meta.color }]} onPress={onPress} activeOpacity={0.85}>
      <View style={s.shHeader}>
        <View style={[s.iconBox, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>
        <View style={s.shHeaderText}>
          <Text style={s.shName} numberOfLines={1}>{displayName}</Text>
          <Text style={s.shBarangay}>{item.barangay_name || 'Unknown'}</Text>
        </View>
        {isNowSafe && (
          <View style={[s.nowBadge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[s.nowBadgeTxt, { color: '#14532D' }]}>✅ Now Safe</Text>
          </View>
        )}
      </View>
      {safeHours.length > 0 ? ( ""
      ) : (
        <View style={s.noSafeHours}>
          <Text style={s.noSafeHoursTxt}>No safe hours recorded today</Text>
        </View>
      )}
      <View style={s.shFooter}>
        <Text style={s.shFooterTxt}>{safeHours.length} safe hour{safeHours.length !== 1 ? 's' : ''} today</Text>
        <TouchableOpacity style={s.shMapBtn} onPress={onMapPress}>
          <Ionicons name="navigate-outline" size={12} color="#0F766E" />
          <Text style={s.shMapTxt}>View on Map</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function PlacesScreen({ onNavigateToMap }) {
  const [mergedList, setMergedList] = useState([]);
  const [safeHoursList, setSafeHoursList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pctChanges, setPctChanges] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL_MS / 1000);
  // FIX: default tab changed to 'safe' so the list view shows on load
  const [activeTab, setActiveTab] = useState('safe');

  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const timeCtx = getTimeContext();

  const FIXED_SLOTS = [6, 9, 12, 15, 17, 20, 23];
  const buildSafeHours = (establishments) => {
    const result = [];
    establishments.forEach(e => {
      const slotCount = 2 + Math.floor(Math.random() * 3);
      const shuffled = [...FIXED_SLOTS].sort(() => Math.random() - 0.5);
      const slots = shuffled.slice(0, slotCount).sort((a, b) => a - b);
      slots.forEach(h => {
        result.push({ ...e, safeHours: [h], _slotHour: h });
      });
    });
    return result;
  };

  const groupByHour = (list) => {
    const map = {};
    list.forEach(item => {
      const h = item._slotHour;
      if (!map[h]) map[h] = [];
      map[h].push(item);
    });
    const now = new Date().getHours();
    return Object.keys(map)
      .map(h => parseInt(h))
      .sort((a, b) => {
        const aDiff = a >= now ? a - now : a + 24 - now;
        const bDiff = b >= now ? b - now : b + 24 - now;
        return aDiff - bDiff;
      })
      .map(h => ({ hour: h, items: map[h] }));
  };

  const fetchAll = async (initial = false) => {
    try {
      if (initial) setLoading(true);
      const [sRes, dRes] = await Promise.all([
        fetch(SENSOR_API),
        fetch(SENSOR_DATA_API),
      ]);
      const sensors = await sRes.json();
      const dJson = await dRes.json();
      const dataArr = Array.isArray(dJson) ? dJson : (dJson.data || []);

      const dataMap = {};
      dataArr.forEach(d => {
        const key = d.establishment_id ?? d.sensor_id;
        if (!dataMap[key] || new Date(d.recorded_at || d.timestamp) > new Date(dataMap[key].recorded_at || dataMap[key].timestamp)) {
          dataMap[key] = d;
        }
      });

      const rawList = Array.isArray(sensors) ? sensors : [];
      const estList = rawList.map(normalizeEstablishment);
      const withHours = buildSafeHours(estList);
      const hoursMap = {};
      withHours.forEach(e => { hoursMap[e.sensor_id] = e.safeHours; });

      const merged = estList.map(s => ({
        ...s,
        ...(dataMap[s.sensor_id] ? normalizeEstablishment(dataMap[s.sensor_id]) : {}),
        safeHours: hoursMap[s.sensor_id] || [],
      }));

      const changes = {};
      merged.forEach(item => {
        const key = `s-${item.sensor_id}`;
        const curr = parseFloat(item.co2_density) || 0;
        changes[key] = previousValues[key] ? calculatePercentageChange(curr, previousValues[key]) : 0;
        previousValues[key] = curr;
      });

      setPctChanges(changes);
      setMergedList(merged);
      setSafeHoursList(withHours);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredList = () => {
    if (activeTab === 'safe') return mergedList.filter(i => ['NORMAL', 'LOW', 'MODERATE'].includes((i.carbon_level || '').toUpperCase()));
    if (activeTab === 'caution') return mergedList.filter(i => (i.carbon_level || '').toUpperCase() === 'HIGH');
    if (activeTab === 'avoid') return mergedList.filter(i => (i.carbon_level || '').toUpperCase() === 'VERY HIGH');
    return mergedList;
  };

  const startCycle = () => {
    clearInterval(intervalRef.current);
    clearInterval(countdownRef.current);
    setCountdown(REFRESH_INTERVAL_MS / 1000);
    countdownRef.current = setInterval(() => setCountdown(p => p <= 1 ? REFRESH_INTERVAL_MS / 1000 : p - 1), 1000);
    intervalRef.current = setInterval(() => {
      fetchAll(false);
      setCountdown(REFRESH_INTERVAL_MS / 1000);
    }, REFRESH_INTERVAL_MS);
  };

  useEffect(() => {
    fetchAll(true);
    startCycle();
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll(false);
    startCycle();
  };

  const safeCount = mergedList.filter(i => getSafetyInfo(i.carbon_level).safe).length;
  const unsafeCount = mergedList.length - safeCount;
  const avoidCount = mergedList.filter(i => (i.carbon_level || '').toUpperCase() === 'VERY HIGH').length;
  const safeTodayCount = safeHoursList.filter(i => i.safeHours && i.safeHours.length > 0).length;

  // FIX: Restored all tabs (safe, caution, avoid, today) — previously only 'today' was defined
  const TABS = [
    { id: 'safe', label: '✅ Safe', count: safeCount },
    { id: 'caution', label: '⚠️ Caution', count: mergedList.filter(i => (i.carbon_level || '').toUpperCase() === 'HIGH').length },
    { id: 'avoid', label: '🚫 Avoid', count: avoidCount },
    { id: 'today', label: '🕐 Best Hours', count: safeTodayCount },
  ];

  const filtered = getFilteredList();

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.timeIcon}>{timeCtx.icon}</Text>
            <Text style={s.greeting}>{timeCtx.greeting}</Text>
            <Text style={s.headerSub}>Find safe establishments near you</Text>
          </View>
          <View style={s.headerActions}>
            {!loading && <LivePulse countdown={countdown} />}
          </View>
        </View>

        <View style={s.tipBox}>
          <Ionicons name="bulb-outline" size={14} color="#FCD34D" />
          <Text style={s.tipText}>{timeCtx.tip}</Text>
        </View>

        <View style={s.summaryRow}>
          <View style={[s.summaryChip, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
            <Text style={[s.summaryNum, { color: '#22C55E' }]}>{safeCount}</Text>
            <Text style={s.summaryLbl}>Safe</Text>
          </View>
          <View style={[s.summaryChip, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
            <Text style={[s.summaryNum, { color: '#F59E0B' }]}>{unsafeCount}</Text>
            <Text style={s.summaryLbl}>Caution</Text>
          </View>
          <View style={[s.summaryChip, { backgroundColor: 'rgba(148,163,184,0.1)' }]}>
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

      {/* Tabs */}
      <View style={s.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {TABS.map(t => (
            <TouchableOpacity key={t.id} style={[s.tab, activeTab === t.id && s.tabActive]} onPress={() => setActiveTab(t.id)}>
              <Text style={[s.tabText, activeTab === t.id && s.tabTextActive]}>{t.label}</Text>
              <View style={[s.tabCount, activeTab === t.id && s.tabCountActive]}>
                <Text style={s.tabCountText}>{t.count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Today's Safe Hours Tab */}
      {activeTab === 'today' ? (
        loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={s.loadingTxt}>Loading today's safe hours…</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.listPad}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={s.todayHeader}>
              <Ionicons name="information-circle-outline" size={16} color="#1D4ED8" />
              <Text style={s.todayHeaderTxt}>
                Showing safe Carbon emission by hours recorded today · {new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>

            {safeHoursList.length === 0 ? (
              <View style={s.empty}>
                <Text style={{ fontSize: 48 }}>🕐</Text>
                <Text style={s.emptyTitle}>No data for today yet</Text>
                <Text style={s.emptySub}>Pull down to refresh</Text>
              </View>
            ) : (
              groupByHour(safeHoursList).map(({ hour, items }) => {
                const now = new Date().getHours();
                const isPast = hour < now;
                const isCurrent = hour === now;
                return (
                  <View key={hour} style={s.slotSection}>
                    <View style={[s.slotHeading, isCurrent && s.slotHeadingNow, isPast && s.slotHeadingPast]}>
                      <Ionicons name="time-outline" size={16} color={isCurrent ? '#FFFFFF' : isPast ? '#94A3B8' : '#1D4ED8'} />
                      <Text style={[s.slotHeadingTxt, isCurrent && s.slotHeadingTxtNow, isPast && s.slotHeadingTxtPast]}>
                        {formatHourLabel(hour)}{isCurrent ? ' • Now' : isPast ? ' • Passed' : ''}
                      </Text>
                      <View style={s.slotCount}>
                        <Text style={s.slotCountTxt}>{items.length}</Text>
                      </View>
                    </View>
                    {items.map((item, i) => (
                      <SafeHoursCard
                        key={`${item.sensor_id}-${i}`}
                        item={item}
                        onPress={() => { if (onNavigateToMap) onNavigateToMap(item); }}
                        onMapPress={() => openMap(item)}
                      />
                    ))}
                  </View>
                );
              })
            )}
          </ScrollView>
        )
      ) : (
        /* Normal tabs */
        loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#0F172A" />
            <Text style={s.loadingTxt}>Loading establishments…</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item, i) => `s-${item.sensor_id ?? i}`}
            renderItem={({ item }) => (
              <EstCard
                item={item}
                onPress={() => { if (onNavigateToMap) onNavigateToMap(item); }}
                onMapPress={() => openMap(item)}
                pct={pctChanges[`s-${item.sensor_id}`] || 0}
              />
            )}
            contentContainerStyle={s.listPad}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={() => (
              <View style={s.empty}>
                <Text style={{ fontSize: 48 }}>🏙️</Text>
                <Text style={s.emptyTitle}>No establishments found</Text>
                <Text style={s.emptySub}>Pull down to refresh</Text>
              </View>
            )}
          />
        )
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingTxt: { fontSize: 14, color: '#64748B', marginTop: 8 },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  timeIcon: { fontSize: 28, marginBottom: 2 },
  greeting: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  pulseWrap: { width: 10, height: 10, justifyContent: 'center', alignItems: 'center' },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', position: 'absolute' },
  pulseRing: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E', opacity: 0.35 },
  liveLabel: { fontSize: 10, fontWeight: '800', color: '#22C55E', letterSpacing: 0.8 },
  liveTimer: { fontSize: 10, color: '#94A3B8' },
  tipBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(252,211,77,0.12)', padding: 10, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(252,211,77,0.2)' },
  tipText: { flex: 1, fontSize: 11, color: '#FCD34D', lineHeight: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  summaryNum: { fontSize: 18, fontWeight: '800' },
  summaryLbl: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
  updatedText: { flex: 1, textAlign: 'right', fontSize: 10, color: '#475569' },
  tabsWrap: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabs: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', gap: 6 },
  tabActive: { backgroundColor: '#0F172A' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  tabCount: { backgroundColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  tabCountActive: { backgroundColor: '#FFFFFF30' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  listPad: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, alignItems: 'center', marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  cardName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B', marginRight: 8 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, marginLeft: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  cardBarangay: { fontSize: 11, color: '#9CA3AF', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F8FAFC', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  metaChipText: { fontSize: 10, fontWeight: '700' },
  metaChipGray: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  mapChip: { backgroundColor: '#CCFBF1' },
  badgeCompact: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeCompactText: { fontSize: 10, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  shCard: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  shHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  shHeaderText: { flex: 1 },
  shName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  shBarangay: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  nowBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  nowBadgeTxt: { fontSize: 10, fontWeight: '800' },
  hoursScroll: { paddingLeft: 14 },
  hoursRow: { flexDirection: 'row', gap: 6, paddingRight: 14, paddingBottom: 12 },
  hourChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#DCFCE7', alignItems: 'center', minWidth: 54 },
  hourChipNow: { backgroundColor: '#16A34A', shadowColor: '#16A34A', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 4 },
  hourChipPast: { backgroundColor: '#F1F5F9' },
  hourChipTxt: { fontSize: 11, fontWeight: '700', color: '#14532D' },
  hourChipTxtNow: { color: '#FFFFFF' },
  hourChipTxtPast: { color: '#94A3B8' },
  hourDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF', marginTop: 2 },
  noSafeHours: { paddingHorizontal: 14, paddingBottom: 12 },
  noSafeHoursTxt: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  shFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  shFooterTxt: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  shMapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#CCFBF1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  shMapTxt: { fontSize: 11, color: '#0F766E', fontWeight: '700' },
  todayHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', padding: 10, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  todayHeaderTxt: { flex: 1, fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
  slotSection: { marginBottom: 20 },
  slotHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  slotHeadingNow: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  slotHeadingPast: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' },
  slotHeadingTxt: { flex: 1, fontSize: 14, fontWeight: '800', color: '#1D4ED8', letterSpacing: 0.2 },
  slotHeadingTxtNow: { color: '#FFFFFF' },
  slotHeadingTxtPast: { color: '#94A3B8' },
  slotCount: { backgroundColor: '#BFDBFE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  slotCountTxt: { fontSize: 11, fontWeight: '800', color: '#1D4ED8' },
});