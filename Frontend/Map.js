import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, StatusBar,
  Dimensions, Image, TextInput, FlatList, Modal,
  ScrollView, KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Icons from 'lucide-react-native';

// Screen Imports
import DashboardScreen from './dashboard';
import ReportsScreen from './reports';
import PredictionScreen from './prediction';
import PlacesScreen from './Establishments';

const { width, height } = Dimensions.get('window');
const LOGO_IMG = require('./assets/image.png');

const SENSOR_API      = 'https://bytetech-final1.onrender.com/sensor';
const SENSOR_DATA_API = 'https://bytetech-final1.onrender.com/sensor-data';
const FEEDBACK_API    = 'https://bytetech-final1.onrender.com/create/feedback'; // ← swap route if needed

const NAGA_CITY_CENTER = {
  latitude: 13.6218,
  longitude: 123.1948,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const getCarbonColor = (level) => {
  if (!level) return '#6CAE75';
  switch (level.toUpperCase()) {
    case 'VERY HIGH': return '#D64545';
    case 'HIGH':      return '#E8A75D';
    case 'MODERATE':  return '#F59E0B';
    case 'LOW':       return '#3B82F6';
    default:          return '#6CAE75';
  }
};

const SafeIcon = ({ name, size = 24, color = '#000' }) => {
  const IconComponent = Icons[name];
  return IconComponent ? <IconComponent size={size} color={color} /> : <View />;
};

// ─── Feedback Modal ────────────────────────────────────────────────────────────
const RATING_OPTIONS = [
  { emoji: '😞', label: 'Poor',      value: 1 },
  { emoji: '😐', label: 'Fair',      value: 2 },
  { emoji: '🙂', label: 'Good',      value: 3 },
  { emoji: '😄', label: 'Great',     value: 4 },
  { emoji: '🤩', label: 'Excellent', value: 5 },
];

const CATEGORY_OPTIONS = [
  'Report a Bug',
  'Improvement',
  'General Feedback',
  'Others',
];

const FeedbackModal = ({ visible, onClose, currentTab }) => {
  const [feedbackName, setFeedbackName] = useState('');
  const [rating, setRating]             = useState(null);
  const [feedbackType, setFeedbackType] = useState(null);
  const [message, setMessage]           = useState('');
  const [submitted, setSubmitted]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);
  const scaleAnim                   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setFeedbackName('');
      setRating(null);
      setFeedbackType(null);
      setMessage('');
      setSubmitted(false);
      setError(null);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!rating || !feedbackType || !message.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      feedback_name: feedbackName.trim() || null,
      feedback_type: feedbackType,
      rating,
      message: message.trim(),
    };

    console.log('📤 Submitting feedback to:', FEEDBACK_API);
    console.log('📦 Payload:', JSON.stringify(payload));

    try {
      const res = await fetch(FEEDBACK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Log the raw response before checking ok
      const responseText = await res.text();
      console.log('📥 Status:', res.status);
      console.log('📥 Response body:', responseText);

      if (!res.ok) {
        setError(`Error ${res.status}: ${responseText}`);
        return;
      }

      setSubmitted(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      console.error('🔥 Network error:', err.message);
      setError(`Network error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <Animated.View style={[styles.modalCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.modalHandle} />

          {submitted ? (
            <View style={styles.successContainer}>
              <Text style={styles.successEmoji}>🎉</Text>
              <Text style={styles.successTitle}>Thank you!</Text>
              <Text style={styles.successSub}>Your feedback helps us improve.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Share Feedback</Text>
                  <Text style={styles.modalSubtitle}>{currentTab} Screen</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
                  <Icons.X size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Rating */}
              <Text style={styles.sectionLabel}>How was your experience?</Text>
              <View style={styles.ratingRow}>
                {RATING_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.ratingItem, rating === opt.value && styles.ratingItemSelected]}
                    onPress={() => setRating(opt.value)}
                  >
                    <Text style={styles.ratingEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.ratingLabel, rating === opt.value && styles.ratingLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Name */}
              <Text style={styles.sectionLabel}>
                Your Name <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.messageInput, { minHeight: 44, marginBottom: 16 }]}
                placeholder="Enter your name..."
                placeholderTextColor="#C4C4C4"
                value={feedbackName}
                onChangeText={setFeedbackName}
              />

              {/* Feedback Type */}
              <Text style={styles.sectionLabel}>Feedback Type *</Text>
              <View style={styles.categoryWrap}>
                {CATEGORY_OPTIONS.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, feedbackType === cat && styles.categoryChipSelected]}
                    onPress={() => setFeedbackType(prev => prev === cat ? null : cat)}
                  >
                    <Text style={[styles.categoryChipText, feedbackType === cat && styles.categoryChipTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Message */}
              <Text style={styles.sectionLabel}>Message *</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Describe your experience..."
                placeholderTextColor="#C4C4C4"
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, (!rating || !feedbackType || !message.trim() || submitting) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!rating || !feedbackType || !message.trim() || submitting}
              >
                <Icons.Send size={16} color="white" />
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Shrinking Feedback FAB ───────────────────────────────────────────────────
//
//  Timeline per session:
//    0s   → mounts EXPANDED (icon + "Feedback" label)
//    60s  → smoothly shrinks to icon-only circle
//    tap  → if shrunk: expand + reset 60s timer
//           if expanded: open feedback modal + reset 60s timer
//
const SHRINK_AFTER_MS = 10_000; // 1 minute

const FeedbackButton = ({ onPress, bottomOffset = 100 }) => {
  const [expanded, setExpanded] = useState(true);
  const widthAnim               = useRef(new Animated.Value(1)).current;
  const timerRef                = useRef(null);

  const animateTo = (val) =>
    Animated.spring(widthAnim, {
      toValue: val,
      useNativeDriver: false,
      tension: 70,
      friction: 8,
    }).start();

  const startShrinkTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      animateTo(0);
      setExpanded(false);
    }, SHRINK_AFTER_MS);
  };

  useEffect(() => {
    startShrinkTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handlePress = () => {
    if (!expanded) {
      // First tap when shrunk → just expand, don't open modal yet
      animateTo(1);
      setExpanded(true);
      startShrinkTimer();
    } else {
      // Already expanded → open the modal
      onPress();
      startShrinkTimer(); // reset timer after interaction
    }
  };

  // Width: 0 → 44px (icon circle), 1 → 130px (full pill)
  const animatedWidth = widthAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [44, 130],
  });

  // Label fades out in the first half of the shrink animation
  const labelOpacity = widthAnim.interpolate({
    inputRange:  [0, 0.4, 1],
    outputRange: [0,  0,   1],
  });

  return (
    <Animated.View style={[styles.fabFeedback, { bottom: bottomOffset + 16, width: animatedWidth }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.fabInner}>
        <Icons.MessageSquarePlus size={18} color="white" />
        <Animated.Text style={[styles.fabFeedbackText, { opacity: labelOpacity }]}>
          Feedback
        </Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Main MapScreen ───────────────────────────────────────────────────────────
const MapScreen = () => {
  const mapRef = useRef(null);
  const [currentTab, setCurrentTab]           = useState('Map');
  const [selectedSensor, setSelectedSensor]   = useState(null);
  const [mergedSensors, setMergedSensors]     = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [searchQuery, setSearchQuery]         = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  useEffect(() => {
    fetchAllData();
    setupLocation();
  }, []);

  const setupLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      () => {}
    );
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [sensorRes, dataRes] = await Promise.all([
        fetch(SENSOR_API),
        fetch(SENSOR_DATA_API),
      ]);
      const sensorList = await sensorRes.json();
      const dataJson   = await dataRes.json();
      const dataList   = Array.isArray(dataJson) ? dataJson : (dataJson.data || []);

      const dataMap = {};
      dataList.forEach(d => { dataMap[d.sensor_id] = d; });

      const merged = (Array.isArray(sensorList) ? sensorList : []).map(s => ({
        ...s,
        ...(dataMap[s.sensor_id] || {}),
      }));

      setMergedSensors(merged);
    } catch (err) {
      console.error('fetchAllData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.length > 0) {
      setFilteredResults(
        mergedSensors.filter(s =>
          (s.barangay_name || '').toLowerCase().includes(text.toLowerCase()) ||
          (s.sensor_name   || '').toLowerCase().includes(text.toLowerCase())
        )
      );
    } else {
      setFilteredResults([]);
    }
  };

  const selectSearchResult = (item) => {
    mapRef.current?.animateToRegion({
      latitude:       parseFloat(item.latitude),
      longitude:      parseFloat(item.longitude),
      latitudeDelta:  0.01,
      longitudeDelta: 0.01,
    }, 1000);
    setSearchQuery('');
    setFilteredResults([]);
    setSelectedSensor(item);
  };

  const renderMapContent = () => (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={NAGA_CITY_CENTER}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => {
          setSelectedSensor(null);
          setFilteredResults([]);
        }}
      >
        {mergedSensors.map((sensor) => {
          const lat = parseFloat(sensor.latitude);
          const lng = parseFloat(sensor.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;
          return (
            <Marker
              key={`s-${sensor.sensor_id}`}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => setSelectedSensor(sensor)}
            >
              <View style={[styles.customMarker, { borderColor: getCarbonColor(sensor.carbon_level) }]}>
                <Image source={LOGO_IMG} style={styles.markerLogo} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icons.Search size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search barangay..."
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.searchLocateBtn}
            onPress={async () => {
              const loc = await Location.getCurrentPositionAsync({});
              mapRef.current?.animateToRegion({
                latitude:       loc.coords.latitude,
                longitude:      loc.coords.longitude,
                latitudeDelta:  0.01,
                longitudeDelta: 0.01,
              }, 1000);
            }}
          >
            <Icons.LocateFixed size={22} color="#555" />
          </TouchableOpacity>
        </View>

        {filteredResults.length > 0 && (
          <View style={styles.resultsList}>
            <FlatList
              data={filteredResults}
              keyExtractor={(item) => `r-${item.sensor_id}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => selectSearchResult(item)}>
                  <Text style={styles.resultText}>
                    {item.barangay_name}
                    {'  '}
                    <Text style={{ fontSize: 10, color: '#999' }}>
                      {item.carbon_level ? `(${item.carbon_level})` : ''}
                    </Text>
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={{ flex: 1 }}>
        {
         currentTab === 'Map'        ? renderMapContent()   :
         currentTab === 'Dashboard'  ? <DashboardScreen />  :
         currentTab === 'Reports'    ? <ReportsScreen />    :
         currentTab === 'Prediction' ? <PredictionScreen /> :
                                       <PlacesScreen onNavigateToMap={(item) => {
                                         const lat = parseFloat(item.latitude);
                                         const lng = parseFloat(item.longitude);
                                         setSelectedSensor(item);
                                         setCurrentTab('Map');
                                         if (!isNaN(lat) && !isNaN(lng)) {
                                           setTimeout(() => {
                                             mapRef.current?.animateToRegion({
                                               latitude: lat,
                                               longitude: lng,
                                               latitudeDelta: 0.01,
                                               longitudeDelta: 0.01,
                                             }, 800);
                                           }, 300);
                                         }
                                       }} />
        }
      </View>

      {/* ── Sensor Info Card ────────────────────────────────────────────── */}
      {currentTab === 'Map' && selectedSensor && (
        <View style={styles.cardOverlay}>
          <View style={[
            styles.infoCard,
            { borderTopColor: getCarbonColor(selectedSensor.carbon_level), borderTopWidth: 4 },
          ]}>
            <Text style={styles.brgyName}>Brgy. {selectedSensor.barangay_name || 'Unknown'}</Text>
            <Text style={styles.sensorSubtitle}>{selectedSensor.sensor_name}</Text>

            {selectedSensor.carbon_level && (
              <View style={[styles.carbonPill, { backgroundColor: getCarbonColor(selectedSensor.carbon_level) }]}>
                <Text style={styles.carbonPillText}>{selectedSensor.carbon_level}</Text>
              </View>
            )}

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <SafeIcon name="Wind" color="#3B82F6" size={20} />
                <Text style={styles.statVal}>{selectedSensor.co2_density ?? '—'} ppm</Text>
                <Text style={styles.statLbl}>CO₂</Text>
              </View>
              <View style={styles.statBox}>
                <SafeIcon name="Thermometer" color="#EF4444" size={20} />
                <Text style={styles.statVal}>
                  {selectedSensor.temperature_c != null ? `${selectedSensor.temperature_c}°C` : '—'}
                </Text>
                <Text style={styles.statLbl}>Temp</Text>
              </View>
              <View style={styles.statBox}>
                <SafeIcon name="Droplets" color="#06B6D4" size={20} />
                <Text style={styles.statVal}>
                  {selectedSensor.humidity != null
                    ? `${parseFloat(selectedSensor.humidity).toFixed(1)}%` : '—'}
                </Text>
                <Text style={styles.statLbl}>Humidity</Text>
              </View>
              <View style={styles.statBox}>
                <SafeIcon name="Flame" color="#F97316" size={20} />
                <Text style={styles.statVal}>
                  {selectedSensor.heat_index_c != null ? `${selectedSensor.heat_index_c}°C` : '—'}
                </Text>
                <Text style={styles.statLbl}>Heat Idx</Text>
              </View>
            </View>

            {selectedSensor.recorded_at && (
              <Text style={styles.recordedAt}>
                Last update: {new Date(selectedSensor.recorded_at).toLocaleTimeString()}
              </Text>
            )}
            <TouchableOpacity onPress={() => setSelectedSensor(null)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Shrinking Feedback FAB (persists across all tabs) ────────────── */}
      <FeedbackButton
        onPress={() => setFeedbackVisible(true)}
        bottomOffset={80}
      />

      {/* ── Feedback Modal ───────────────────────────────────────────────── */}
      <FeedbackModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        currentTab={currentTab}
      />

      {/* ── Bottom Tab Bar ──────────────────────────────────────────────── */}
      <View style={styles.bottomTabBar}>
        {[
          { name: 'Dashboard',  icon: 'LayoutDashboard' },
          { name: 'Map',        icon: 'Map'             },
          { name: 'Reports',    icon: 'ClipboardList'   },
          { name: 'Places',     icon: 'MapPin'          },
          { name: 'Prediction', icon: 'TrendingUp'      },
        ].map(tab => (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => setCurrentTab(tab.name)}
          >
            <SafeIcon
              name={tab.icon}
              size={22}
              color={currentTab === tab.name ? '#FF5C4D' : '#999'}
            />
            <Text style={[styles.tabLabel, { color: currentTab === tab.name ? '#FF5C4D' : '#999' }]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#FFF' },
  map:             { flex: 1 },

  searchContainer: { position: 'absolute', top: 55, width: '100%', alignItems: 'center', zIndex: 10 },
  searchBar:       { flexDirection: 'row', width: width * 0.9, backgroundColor: 'white', borderRadius: 15, paddingHorizontal: 15, height: 50, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  searchInput:     { flex: 1, marginLeft: 10, fontSize: 15 },
  searchLocateBtn: { padding: 5, borderLeftWidth: 1, borderLeftColor: '#EEE', marginLeft: 5 },
  resultsList:     { width: width * 0.9, backgroundColor: 'white', marginTop: 5, borderRadius: 15, maxHeight: 200, elevation: 5 },
  resultItem:      { padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  resultText:      { fontWeight: '600', fontSize: 14 },

  customMarker:    { backgroundColor: 'white', padding: 2, borderRadius: 20, borderWidth: 3, elevation: 5 },
  markerLogo:      { width: 24, height: 24, borderRadius: 12 },

  cardOverlay:     { position: 'absolute', bottom: 100, width: '100%', alignItems: 'center', zIndex: 50 },
  infoCard:        { width: width * 0.9, backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
  brgyName:        { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  sensorSubtitle:  { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
  carbonPill:      { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 14 },
  carbonPillText:  { color: 'white', fontWeight: '700', fontSize: 12 },
  statsGrid:       { flexDirection: 'row', justifyContent: 'space-between' },
  statBox:         { flex: 1, alignItems: 'center', padding: 8, backgroundColor: '#F9FAFB', borderRadius: 12, marginHorizontal: 3 },
  statVal:         { fontSize: 13, fontWeight: '700', color: '#1F2937', marginTop: 4 },
  statLbl:         { fontSize: 9, color: '#9CA3AF', marginTop: 2 },
  recordedAt:      { fontSize: 10, color: '#D1D5DB', marginTop: 12, textAlign: 'right' },
  closeBtn:        { marginTop: 14, alignSelf: 'center' },
  closeBtnText:    { color: '#6B7280', fontWeight: '600' },

  bottomTabBar:    { flexDirection: 'row', height: 80, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#EEE', paddingBottom: 10, zIndex: 100 },
  tabItem:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel:        { fontSize: 10, marginTop: 4 },

  // ── FAB ───────────────────────────────────────────────────────────────────
  fabFeedback: {
    position: 'absolute',
    right: 16,
    height: 44,
    backgroundColor: '#FF5C4D',
    borderRadius: 22,
    elevation: 8,
    shadowColor: '#FF5C4D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    zIndex: 200,
    overflow: 'hidden',
  },
  fabInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    gap: 6,
    left: 10
  },
  fabFeedbackText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Modal ─────────────────────────────────────────────────────────────────
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingBottom: 36, paddingTop: 12, maxHeight: height * 0.85 },
  modalHandle:     { alignSelf: 'center', width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 16 },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle:      { fontSize: 20, fontWeight: '800', color: '#111827' },
  modalSubtitle:   { fontSize: 12, color: '#FF5C4D', fontWeight: '600', marginTop: 2 },
  closeIcon:       { backgroundColor: '#F3F4F6', borderRadius: 20, padding: 6 },

  sectionLabel:    { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  optional:        { fontWeight: '400', color: '#9CA3AF' },

  ratingRow:            { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  ratingItem:           { flex: 1, alignItems: 'center', paddingVertical: 10, marginHorizontal: 3, borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: 'transparent' },
  ratingItemSelected:   { borderColor: '#FF5C4D', backgroundColor: '#FFF5F4' },
  ratingEmoji:          { fontSize: 22 },
  ratingLabel:          { fontSize: 9, color: '#9CA3AF', marginTop: 4, fontWeight: '600' },
  ratingLabelSelected:  { color: '#FF5C4D' },

  categoryWrap:             { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  categoryChip:             { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  categoryChipSelected:     { borderColor: '#FF5C4D', backgroundColor: '#FFF5F4' },
  categoryChipText:         { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  categoryChipTextSelected: { color: '#FF5C4D' },

  messageInput:    { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, fontSize: 14, color: '#111827', minHeight: 90, marginBottom: 12, backgroundColor: '#FAFAFA' },
  errorText:       { color: '#D64545', fontSize: 12, marginBottom: 10, textAlign: 'center' },

  submitBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF5C4D', borderRadius: 16, paddingVertical: 15, gap: 8, elevation: 4, shadowColor: '#FF5C4D', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, marginBottom: 4 },
  submitBtnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0, elevation: 0 },
  submitBtnText:     { color: 'white', fontWeight: '800', fontSize: 15 },

  successContainer: { alignItems: 'center', paddingVertical: 40 },
  successEmoji:     { fontSize: 52, marginBottom: 12 },
  successTitle:     { fontSize: 22, fontWeight: '800', color: '#111827' },
  successSub:       { fontSize: 14, color: '#9CA3AF', marginTop: 6 },
});

export default MapScreen;