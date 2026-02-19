// CalendarPicker.js
// Shared modal calendar picker used by Dashboard and Reports.
// Uses ScrollView instead of FlatList to avoid the React Native bug
// where FlatList renders empty inside a Modal with maxHeight constraint.

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Build list of {year, month (0-based)} from earliest date to today
const buildMonthRange = (earliestDate) => {
  const months = [];
  const start  = new Date(earliestDate || new Date().toISOString());
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setDate(1);
  end.setHours(0, 0, 0, 0);

  const cur = new Date(start);
  while (cur <= end) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }
  return months.reverse(); // most recent first
};

// Build week list within a given year+month
const buildWeeksInMonth = (year, month) => {
  const weeks    = [];
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
export default function CalendarPicker({
  visible,
  onClose,
  mode,
  selected,
  onSelect,
  earliestDate,
}) {
  const [pickedMonth, setPickedMonth] = useState(null);

  const monthRange = buildMonthRange(earliestDate || new Date().toISOString());

  const handleMonthPress = (item) => {
    if (mode === 'monthly') {
      onSelect({ year: item.year, month: item.month });
      onClose();
    } else {
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

  const handleClose = () => {
    setPickedMonth(null);
    onClose();
  };

  const isMonthSelected = (item) =>
    selected?.year === item.year && selected?.month === item.month;

  // Build rows of 3 for the month grid
  const monthRows = [];
  for (let i = 0; i < monthRange.length; i += 3) {
    monthRows.push(monthRange.slice(i, i + 3));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            {pickedMonth && mode === 'weekly' ? (
              <TouchableOpacity
                onPress={() => setPickedMonth(null)}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={20} color="#2D2D2D" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 32 }} />
            )}

            <Text style={styles.headerTitle}>
              {pickedMonth && mode === 'weekly'
                ? `${MONTHS[pickedMonth.month]} ${pickedMonth.year}`
                : mode === 'monthly' ? 'Select Month' : 'Select Week'}
            </Text>

            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#2D2D2D" />
            </TouchableOpacity>
          </View>

          {/* ── Month grid (ScrollView instead of FlatList) ── */}
          {(!pickedMonth || mode === 'monthly') && (
            <ScrollView
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
            >
              {monthRows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.gridRow}>
                  {row.map((item) => {
                    const active  = isMonthSelected(item);
                    const isToday =
                      item.year  === new Date().getFullYear() &&
                      item.month === new Date().getMonth();
                    return (
                      <TouchableOpacity
                        key={`${item.year}-${item.month}`}
                        style={[
                          styles.monthCell,
                          active   && styles.monthCellActive,
                          isToday  && !active && styles.monthCellToday,
                        ]}
                        onPress={() => handleMonthPress(item)}
                      >
                        <Text style={[
                          styles.monthAbbr,
                          active && styles.monthAbbrActive,
                        ]}>
                          {MONTHS[item.month].slice(0, 3)}
                        </Text>
                        <Text style={[
                          styles.monthYear,
                          active && styles.monthYearActive,
                        ]}>
                          {item.year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {/* Fill empty cells in last row to keep grid even */}
                  {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.monthCellEmpty} />
                  ))}
                </View>
              ))}
            </ScrollView>
          )}

          {/* ── Week list (ScrollView instead of FlatList) ── */}
          {pickedMonth && mode === 'weekly' && (
            <ScrollView
              contentContainerStyle={styles.weekList}
              showsVerticalScrollIndicator={false}
            >
              {buildWeeksInMonth(pickedMonth.year, pickedMonth.month).map((week) => {
                const active =
                  selected?.year    === pickedMonth.year  &&
                  selected?.month   === pickedMonth.month &&
                  selected?.weekNum === week.weekNum;
                return (
                  <TouchableOpacity
                    key={`w-${week.weekNum}`}
                    style={[styles.weekRow, active && styles.weekRowActive]}
                    onPress={() => handleWeekPress(week)}
                  >
                    <Text style={[styles.weekLabel, active && styles.weekLabelActive]}>
                      {week.label}
                    </Text>
                    {active && (
                      <Ionicons name="checkmark-circle" size={18} color="#FF5C4D" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // ✅ Use fixed height instead of maxHeight — avoids FlatList/ScrollView collapse bug
    height: '60%',
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#2D2D2D' },
  backBtn:     { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  closeBtn:    { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },

  // Month grid
  grid:           { paddingHorizontal: 12, paddingVertical: 16 },
  gridRow:        { flexDirection: 'row', marginBottom: 8 },
  monthCell: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  monthCellActive:  { backgroundColor: '#FF5C4D', borderColor: '#FF5C4D' },
  monthCellToday:   { borderColor: '#FF5C4D' },
  monthCellEmpty:   { flex: 1, marginHorizontal: 6 },
  monthAbbr:        { fontSize: 15, fontWeight: '700', color: '#2D2D2D' },
  monthAbbrActive:  { color: '#fff' },
  monthYear:        { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  monthYearActive:  { color: '#ffd4cf' },

  // Week list
  weekList:       { paddingHorizontal: 16, paddingBottom: 16 },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  weekRowActive:  { backgroundColor: '#FFF0EE' },
  weekLabel:      { fontSize: 15, fontWeight: '600', color: '#2D2D2D' },
  weekLabelActive:{ color: '#FF5C4D' },
});