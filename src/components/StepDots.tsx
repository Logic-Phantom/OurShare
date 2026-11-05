import { StyleSheet, View } from 'react-native';

import { spacing, useColors } from '@/design-system';

export function StepDots({ current, total }: { current: number; total: number }) {
  const c = useColors();
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={`${total}단계 중 ${current + 1}단계`}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.dot, index === current ? [styles.active, { backgroundColor: c.green }] : { backgroundColor: c.border }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  active: { width: 16 },
});
