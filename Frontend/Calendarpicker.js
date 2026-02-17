// CalendarPicker.js
// Shared modal calendar picker used by Dashboard and Reports.
// Shows a grid of months (or weeks within selected month) derived from
// the earliest recorded_at timestamp up to today.

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Build list of {year, month (0-based)} from earliest date to today
const buildMonthRange = (earliestDate) => {
  const months = [];
  const start  = new Date(earliestDate);
  start.setDate(1);
  const end = new Date();
  end.setDate(1);

  const cur = new Date(start);
  while (cur <= end) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months.reverse(); // most recent first
};

// Build ISO week list within a given year+month
const buildWeeksInMonth = (year, month) => {
  const weeks = [];
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);

  let weekStart = new Date(firstDay);
  let weekNum   = 1;

  while (weekStart <= lastDay) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());

    weeks.push({
      label:     `Week ${weekNum} (${weekStart.getDate()}–${weekEnd.getDate()})`,
      weekNum,
      startDate: new Date(weekStart),
      endDate:   new Date(weekEnd),
    });

    weekStart.setDate(weekStart.getDate() + 7);
    weekNum++;
  }
  return weeks;
};

// ─── CalendarPicker ────────────────────────────────────────────────────────────
// Props:
//   visible       – bool
//   onClose       – () => void
//   mode          – 'monthly' | 'weekly'
//   selected      – { year, month, weekNum?, startDate?, endDate? }
//   onSelect      – (selection) => void
//   earliestDate  – ISO string of oldest recorded_at
export default function CalendarPicker({
  visible,
  onClose,
  mode,
  selected,
  onSelect,
  earliestDate,
}) {
  // For weekly mode: user first picks a month, then a week
  const [pickedMonth, setPickedMonth] = useState(null);

  const monthRange = buildMonthRange(earliestDate || '2026-01-01T00:00:00.000Z');

  const handleMonthPress = (item) => {
    if (mode === 'monthly') {
      onSelect({ year: item.year, month: item.month });
      onClose();
    } else {
      // weekly: drill into week picker
      setPickedMonth(item);
    }
  };

  const handleWeekPress = (week) => {
    onSelect({
      year:      pickedMonth.year,
      month:     pickedMonth.month,
      weekNum:   week.weekNum,
      startDate: week.startDate,
      endDate:   week.endDate,
    });
    setPickedMonth(null);
    onClose();
  };

  const isMonthSelected = (item) =>
    selected?.year === item.year && selected?.month === item.month;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            {pickedMonth && mode === 'weekly' ? (
              <TouchableOpacity onPress={() => setPickedMonth(null)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color="#2D2D2D" />
              </TouchableOpacity>
            ) : <View style={{ width: 32 }} />}

            <Text style={styles.headerTitle}>
              {pickedMonth && mode === 'weekly'
                ? `${MONTHS[pickedMonth.month]} ${pickedMonth.year}`
                : mode === 'monthly' ? 'Select Month' : 'Select Week'}
            </Text>

            <TouchableOpacity onPress={() => { setPickedMonth(null); onClose(); }}>
              <Ionicons name="close" size={22} color="#2D2D2D" />
            </TouchableOpacity>
          </View>

          {/* Month grid */}
          {(!pickedMonth || mode === 'monthly') && (
            <FlatList
              data={monthRange}
              keyExtractor={(item) => `${item.year}-${item.month}`}
              numColumns={3}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => {
                const active = isMonthSelected(item);
                const isToday =
                  item.year === new Date().getFullYear() &&
                  item.month === new Date().getMonth();
                return (
                  <TouchableOpacity
                    style={[
                      styles.monthCell,
                      active && styles.monthCellActive,
                      isToday && !active && styles.monthCellToday,
                    ]}
                    onPress={() => handleMonthPress(item)}
                  >
                    <Text style={[styles.monthAbbr, active && styles.monthAbbrActive]}>
                      {MONTHS[item.month].slice(0, 3)}
                    </Text>
                    <Text style={[styles.monthYear, active && styles.monthYearActive]}>
                      {item.year}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Week list (weekly mode, after month picked) */}
          {pickedMonth && mode === 'weekly' && (
            <FlatList
              data={buildWeeksInMonth(pickedMonth.year, pickedMonth.month)}
              keyExtractor={(w) => `w-${w.weekNum}`}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
              renderItem={({ item }) => {
                const active =
                  selected?.year    === pickedMonth.year  &&
                  selected?.month   === pickedMonth.month &&
                  selected?.weekNum === item.weekNum;
                return (
                  <TouchableOpacity
                    style={[styles.weekRow, active && styles.weekRowActive]}
                    onPress={() => handleWeekPress(item)}
                  >
                    <Text style={[styles.weekLabel, active && styles.weekLabelActive]}>
                      {item.label}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark-circle" size={18} color="#FF5C4D" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:              { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingTop: 8 },
  header:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle:        { fontSize: 17, fontWeight: '700', color: '#2D2D2D' },
  backBtn:            { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  grid:               { paddingHorizontal: 12, paddingVertical: 16 },
  monthCell:          { flex: 1, margin: 6, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F8F9FA', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  monthCellActive:    { backgroundColor: '#FF5C4D', borderColor: '#FF5C4D' },
  monthCellToday:     { borderColor: '#FF5C4D' },
  monthAbbr:          { fontSize: 15, fontWeight: '700', color: '#2D2D2D' },
  monthAbbrActive:    { color: '#fff' },
  monthYear:          { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  monthYearActive:    { color: '#ffd4cf' },
  weekRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#F8F9FA' },
  weekRowActive:      { backgroundColor: '#FFF0EE' },
  weekLabel:          { fontSize: 15, fontWeight: '600', color: '#2D2D2D' },
  weekLabelActive:    { color: '#FF5C4D' },
});