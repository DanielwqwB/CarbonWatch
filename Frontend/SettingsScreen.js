import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Modal, SafeAreaView, Platform, StatusBar,
  Alert, ActivityIndicator,
} from 'react-native';
import {
  X, Bell, RefreshCw, Thermometer, Wifi, Info,
  ChevronRight, AlertTriangle, Database, Clock,
  Shield, Trash2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SENSOR_API      = 'https://bytetech-final1.onrender.com/sensor';
const SENSOR_DATA_API = 'https://bytetech-final1.onrender.com/sensor-data';

const STORAGE_KEY = '@envi_settings';

export const DEFAULT_SETTINGS = {
  notifications:       true,
  veryHighAlerts:      true,
  highAlerts:          false,
  tempUnit:            'celsius',   // 'celsius' | 'fahrenheit'
  refreshInterval:     5,           // minutes: 1 | 5 | 15 | 30
  heatStressThreshold: 41,          // °C
  co2AlertThreshold:   'HIGH',      // 'HIGH' | 'VERY HIGH'
};

const REFRESH_OPTIONS    = [1, 5, 15, 30];
const HEAT_THRESHOLDS    = [38, 40, 41, 43];
const CO2_ALERT_OPTIONS  = ['HIGH', 'VERY HIGH'];

// ── Small helpers ─────────────────────────────────────────────────────────────
const SectionHeader = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const RowItem = ({ icon, label, sublabel, right, onPress, danger }) => (
  <TouchableOpacity
    style={styles.row}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.65 : 1}
  >
    <View style={[styles.rowIcon, danger && { backgroundColor: '#FEF2F2' }]}>
      {React.cloneElement(icon, { size: 18, color: danger ? '#D64545' : '#FF5C4D' })}
    </View>
    <View style={styles.rowBody}>
      <Text style={[styles.rowLabel, danger && { color: '#D64545' }]}>{label}</Text>
      {sublabel ? <Text style={styles.rowSub}>{sublabel}</Text> : null}
    </View>
    <View style={styles.rowRight}>{right}</View>
  </TouchableOpacity>
);

const Divider = () => <View style={styles.divider} />;

// ── Picker modal ──────────────────────────────────────────────────────────────
const PickerModal = ({ visible, title, options, selected, onSelect, onClose, renderLabel }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.pickerCard}>
        <Text style={styles.pickerTitle}>{title}</Text>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.pickerOption, selected === opt && styles.pickerOptionActive]}
            onPress={() => { onSelect(opt); onClose(); }}
          >
            <Text style={[styles.pickerOptionText, selected === opt && styles.pickerOptionTextActive]}>
              {renderLabel ? renderLabel(opt) : opt}
            </Text>
            {selected === opt && (
              <View style={styles.pickerCheck}><Text style={{ color: '#FF5C4D', fontWeight: '700' }}>✓</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

// ── Main Settings component ───────────────────────────────────────────────────
export default function SettingsScreen({ visible, onClose }) {
  const [settings, setSettings]         = useState(DEFAULT_SETTINGS);
  const [saving, setSaving]             = useState(false);
  const [apiStatus, setApiStatus]       = useState(null); // null | 'checking' | 'ok' | 'error'
  const [sensorCount, setSensorCount]   = useState(null);
  const [lastChecked, setLastChecked]   = useState(null);

  // Pickers
  const [showRefresh, setShowRefresh]   = useState(false);
  const [showHeat, setShowHeat]         = useState(false);
  const [showCO2Alert, setShowCO2Alert] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch (_) {}
    })();
  }, []);

  // Persist whenever settings change
  useEffect(() => {
    (async () => {
      setSaving(true);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (_) {}
      setSaving(false);
    })();
  }, [settings]);

  const set = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  // ── API health check ──────────────────────────────────────────────────────
  const checkConnection = async () => {
    setApiStatus('checking');
    setSensorCount(null);
    try {
      const [sRes, dRes] = await Promise.all([
        fetch(SENSOR_API,      { signal: AbortSignal.timeout(8000) }),
        fetch(SENSOR_DATA_API, { signal: AbortSignal.timeout(8000) }),
      ]);
      if (!sRes.ok || !dRes.ok) throw new Error('Non-2xx');
      const sensors = await sRes.json();
      setSensorCount(Array.isArray(sensors) ? sensors.length : '?');
      setApiStatus('ok');
      setLastChecked(new Date().toLocaleTimeString());
    } catch (e) {
      setApiStatus('error');
    }
  };

  // ── Clear cache ───────────────────────────────────────────────────────────
  const handleClearCache = () => {
    Alert.alert(
      'Clear App Cache',
      'This will reset all stored settings back to defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEY);
              setSettings(DEFAULT_SETTINGS);
              Alert.alert('Done', 'Settings have been reset to defaults.');
            } catch (_) {
              Alert.alert('Error', 'Could not clear cache.');
            }
          },
        },
      ]
    );
  };

  const statusColor = apiStatus === 'ok' ? '#10B981' : apiStatus === 'error' ? '#D64545' : '#9CA3AF';
  const statusLabel = apiStatus === 'checking'
    ? 'Checking…'
    : apiStatus === 'ok'
      ? `Connected · ${sensorCount} sensors`
      : apiStatus === 'error'
        ? 'Unreachable'
        : lastChecked
          ? `Last OK: ${lastChecked}`
          : 'Tap to test';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.statusBarPlaceholder} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerRight}>
            {saving && <ActivityIndicator size="small" color="#9CA3AF" style={{ marginRight: 12 }} />}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#2D2D2D" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Notifications ── */}
          <SectionHeader title="NOTIFICATIONS" />
          <View style={styles.card}>
            <RowItem
              icon={<Bell />}
              label="Enable Notifications"
              sublabel="Alerts for critical sensor readings"
              right={
                <Switch
                  value={settings.notifications}
                  onValueChange={v => set('notifications', v)}
                  trackColor={{ false: '#E5E7EB', true: '#FF5C4D' }}
                  thumbColor="#fff"
                />
              }
            />
            <Divider />
            <RowItem
              icon={<AlertTriangle />}
              label="Very High CO₂ Alerts"
              sublabel="Immediate push for VERY HIGH level"
              right={
                <Switch
                  value={settings.veryHighAlerts}
                  onValueChange={v => set('veryHighAlerts', v)}
                  disabled={!settings.notifications}
                  trackColor={{ false: '#E5E7EB', true: '#FF5C4D' }}
                  thumbColor="#fff"
                />
              }
            />
            <Divider />
            <RowItem
              icon={<AlertTriangle />}
              label="High CO₂ Alerts"
              sublabel="Push for HIGH level readings"
              right={
                <Switch
                  value={settings.highAlerts}
                  onValueChange={v => set('highAlerts', v)}
                  disabled={!settings.notifications}
                  trackColor={{ false: '#E5E7EB', true: '#FF5C4D' }}
                  thumbColor="#fff"
                />
              }
            />
          </View>

          {/* ── Display ── */}
          <SectionHeader title="DISPLAY" />
          <View style={styles.card}>
            <RowItem
              icon={<Thermometer />}
              label="Temperature Unit"
              sublabel={settings.tempUnit === 'celsius' ? 'Showing °C' : 'Showing °F'}
              right={
                <View style={styles.segmented}>
                  {['celsius', 'fahrenheit'].map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.segment, settings.tempUnit === u && styles.segmentActive]}
                      onPress={() => set('tempUnit', u)}
                    >
                      <Text style={[styles.segmentText, settings.tempUnit === u && styles.segmentTextActive]}>
                        {u === 'celsius' ? '°C' : '°F'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              }
            />
          </View>

          {/* ── Data & Refresh ── */}
          <SectionHeader title="DATA & REFRESH" />
          <View style={styles.card}>
            <RowItem
              icon={<RefreshCw />}
              label="Refresh Interval"
              sublabel="How often to re-fetch sensor data"
              onPress={() => setShowRefresh(true)}
              right={
                <View style={styles.valueChip}>
                  <Text style={styles.valueChipText}>{settings.refreshInterval} min</Text>
                  <ChevronRight size={14} color="#9CA3AF" />
                </View>
              }
            />
          </View>

          {/* ── Thresholds ── */}
          <SectionHeader title="ALERT THRESHOLDS" />
          <View style={styles.card}>
            <RowItem
              icon={<Thermometer />}
              label="Heat Stress Threshold"
              sublabel="Flag sensor as heat stress above this"
              onPress={() => setShowHeat(true)}
              right={
                <View style={styles.valueChip}>
                  <Text style={styles.valueChipText}>{settings.heatStressThreshold}°C</Text>
                  <ChevronRight size={14} color="#9CA3AF" />
                </View>
              }
            />
            <Divider />
            <RowItem
              icon={<AlertTriangle />}
              label="Minimum Alert Level"
              sublabel="Only alert at this level or above"
              onPress={() => setShowCO2Alert(true)}
              right={
                <View style={styles.valueChip}>
                  <Text style={styles.valueChipText}>{settings.co2AlertThreshold}</Text>
                  <ChevronRight size={14} color="#9CA3AF" />
                </View>
              }
            />
          </View>

          {/* ── Connectivity ── */}
          <SectionHeader title="CONNECTIVITY" />
          <View style={styles.card}>
            <RowItem
              icon={<Wifi />}
              label="API Status"
              sublabel={statusLabel}
              onPress={checkConnection}
              right={
                apiStatus === 'checking'
                  ? <ActivityIndicator size="small" color="#FF5C4D" />
                  : (
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  )
              }
            />
            <Divider />
            <RowItem
              icon={<Database />}
              label="Sensor API"
              sublabel="bytetech-final1.onrender.com"
              right={<Text style={styles.mutedText}>/sensor</Text>}
            />
            <Divider />
            <RowItem
              icon={<Clock />}
              label="Data Endpoint"
              sublabel="All historical sensor readings"
              right={<Text style={styles.mutedText}>/sensor-data</Text>}
            />
          </View>

          {/* ── About ── */}
          <SectionHeader title="ABOUT" />
          <View style={styles.card}>
            <RowItem
              icon={<Info />}
              label="ENVI Analytics"
              sublabel="Environmental monitoring platform"
              right={<Text style={styles.versionText}>v1.0.0</Text>}
            />
            <Divider />
            <RowItem
              icon={<Shield />}
              label="Data Privacy"
              sublabel="All data is fetched live — nothing stored externally"
              right={null}
            />
          </View>

          {/* ── Danger Zone ── */}
          <SectionHeader title="DANGER ZONE" />
          <View style={styles.card}>
            <RowItem
              icon={<Trash2 />}
              label="Reset All Settings"
              sublabel="Restore defaults and clear cached preferences"
              onPress={handleClearCache}
              danger
            />
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Picker modals */}
        <PickerModal
          visible={showRefresh}
          title="Refresh Interval"
          options={REFRESH_OPTIONS}
          selected={settings.refreshInterval}
          onSelect={v => set('refreshInterval', v)}
          onClose={() => setShowRefresh(false)}
          renderLabel={v => `Every ${v} minute${v > 1 ? 's' : ''}`}
        />
        <PickerModal
          visible={showHeat}
          title="Heat Stress Threshold"
          options={HEAT_THRESHOLDS}
          selected={settings.heatStressThreshold}
          onSelect={v => set('heatStressThreshold', v)}
          onClose={() => setShowHeat(false)}
          renderLabel={v => `${v}°C`}
        />
        <PickerModal
          visible={showCO2Alert}
          title="Minimum Alert Level"
          options={CO2_ALERT_OPTIONS}
          selected={settings.co2AlertThreshold}
          onSelect={v => set('co2AlertThreshold', v)}
          onClose={() => setShowCO2Alert(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#F8F9FA' },
  statusBarPlaceholder: { height: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  scroll:               { paddingHorizontal: 20, paddingBottom: 40 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#F8F9FA' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#2D2D2D' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  closeBtn:    { padding: 8, borderRadius: 20, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },

  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginTop: 24, marginBottom: 8, paddingHorizontal: 4 },

  card:    { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },

  row:      { flexDirection: 'row', alignItems: 'center', padding: 16, minHeight: 64 },
  rowIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF0EE', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  rowBody:  { flex: 1, marginRight: 10 },
  rowLabel: { fontSize: 14, fontWeight: '600', color: '#2D2D2D' },
  rowSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 2, lineHeight: 16 },
  rowRight: { alignItems: 'flex-end', justifyContent: 'center' },

  segmented:          { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1.5, borderColor: '#E5E7EB' },
  segment:            { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff' },
  segmentActive:      { backgroundColor: '#FF5C4D' },
  segmentText:        { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  segmentTextActive:  { color: '#fff' },

  valueChip:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 4 },
  valueChipText: { fontSize: 13, fontWeight: '600', color: '#2D2D2D' },

  statusDot: { width: 12, height: 12, borderRadius: 6 },

  mutedText:   { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  versionText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  pickerCard:  { backgroundColor: '#fff', borderRadius: 20, width: '100%', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  pickerTitle: { fontSize: 15, fontWeight: '800', color: '#2D2D2D', padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerOption:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  pickerOptionActive:     { backgroundColor: '#FFF0EE' },
  pickerOptionText:       { fontSize: 14, color: '#374151', fontWeight: '500' },
  pickerOptionTextActive: { color: '#FF5C4D', fontWeight: '700' },
  pickerCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF0EE', alignItems: 'center', justifyContent: 'center' },
});