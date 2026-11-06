import { Pressable, StyleSheet, View } from 'react-native';

import { weekDates } from '@/domain/scheduling/week-range';
import { AppText, spacing, useColors } from '@/design-system';
import { dayOfMonth, weekdayName } from '@/utils/dates';

/** Mon–Sun (or Sun–Sat) with dates. Today is green, the selected day is dark, as in the design. */
export function WeekStrip({ weekStartDate, today, selected, onSelect, busyDates }: { weekStartDate: string; today: string; selected?: string; onSelect?: (date: string) => void; busyDates?: ReadonlySet<string> }) {
  const c = useColors();
  return (
    <View style={styles.row}>
      {weekDates(weekStartDate).map((date) => {
        const isSelected = date === selected;
        const isToday = date === today;
        const background = isSelected ? c.primary : isToday && !selected ? c.green : 'transparent';
        const tone = isSelected || (isToday && !selected) ? 'onPrimary' : 'primary';
        const label = `${weekdayName(date)}요일 ${dayOfMonth(date)}일${isToday ? ', 오늘' : ''}${busyDates?.has(date) ? ', 할 일 있음' : ''}`;
        const body = (
          <>
            <AppText variant="caption" tone="secondary">{weekdayName(date)}</AppText>
            <View style={[styles.date, { backgroundColor: background }, isToday && selected && !isSelected && { borderColor: c.green, borderWidth: 2 }]}>
              <AppText variant="bodyStrong" tone={tone}>{dayOfMonth(date)}</AppText>
            </View>
            <View style={[styles.busy, { backgroundColor: busyDates?.has(date) ? c.green : 'transparent' }]} />
          </>
        );
        return onSelect ? (
          <Pressable key={date} onPress={() => onSelect(date)} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: isSelected }} style={styles.day}>
            {body}
          </Pressable>
        ) : (
          <View key={date} style={styles.day} accessible accessibilityLabel={label}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', gap: spacing.xs, minHeight: 48 },
  date: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  busy: { width: 4, height: 4, borderRadius: 2 },
});
