import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useColors } from '../theme';
import { memberPalette, radius, spacing, type MemberColorKey } from '../tokens';
import { AppText } from './AppText';

/** Weekly completion ring. The number is in the label too, so the ring is never the only signal. */
export function ProgressRing({ percent, size = 112, label }: { percent: number; size?: number; label: string }) {
  const c = useColors();
  const stroke = size * 0.11;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: clamped }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surfaceMuted} strokeWidth={stroke} fill="none" />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={c.green}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(circumference * clamped) / 100} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <AppText variant="stat" style={{ fontSize: size * 0.22, lineHeight: size * 0.28 }}>{clamped}%</AppText>
      </View>
    </View>
  );
}

/** One person's share as a bar, with the target drawn as a tick so the gap is visible without color. */
export function ShareBar({ percent, targetPercent, colorKey }: { percent: number; targetPercent?: number; colorKey: string }) {
  const c = useColors();
  const palette = memberPalette[colorKey as MemberColorKey] ?? memberPalette.blue;
  return (
    <View style={[styles.track, { backgroundColor: palette.soft }]}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: palette.main }]} />
      {targetPercent !== undefined ? <View style={[styles.tick, { left: `${targetPercent}%`, backgroundColor: c.textPrimary }]} /> : null}
    </View>
  );
}

export function LegendDot({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="body" style={styles.legendLabel}>{label}</AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 12, borderRadius: radius.pill, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.pill },
  tick: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 120 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { flex: 1 },
});
