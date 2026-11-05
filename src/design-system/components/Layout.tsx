import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '../theme';
import { radius, shadow, spacing } from '../tokens';
import { AppText } from './AppText';
import { IconButton } from './Buttons';

/** Back is shown only on pushed screens; a tab root has nowhere to go back to (D-043). */
export function ScreenHeader({ title, showBack = true, right }: { title: string; showBack?: boolean; right?: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
      <View style={styles.headerSide}>{showBack ? <IconButton icon="chevron-back" label="뒤로" onPress={() => router.back()} /> : null}</View>
      <AppText variant="screenTitle" align="center" numberOfLines={1} style={styles.headerTitle}>
        {title}
      </AppText>
      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  );
}

/** Scrollable body with an optional action fixed to the bottom, within thumb reach. */
export function Screen({ children, footer, contentStyle, ...rest }: ScrollViewProps & { children: ReactNode; footer?: ReactNode; contentStyle?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, !footer && { paddingBottom: spacing.xxl }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        {...rest}>
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.base) }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style, tone = 'surface' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'surface' | 'warm' }) {
  const c = useColors();
  return <View style={[styles.card, shadow.card, { backgroundColor: tone === 'warm' ? c.surfaceWarm : c.surface }, style]}>{children}</View>;
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <AppText variant="sectionTitle">{title}</AppText>
        {right}
      </View>
      {children}
    </View>
  );
}

export function BottomSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} accessibilityLabel="닫기" accessibilityRole="button" />
        <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + spacing.base }]} accessibilityViewIsModal>
          <View style={styles.sheetHead}>
            <AppText variant="sectionTitle" style={styles.flex}>
              {title}
            </AppText>
            <IconButton icon="close" label="닫기" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, paddingBottom: spacing.xs },
  headerSide: { width: 96, minHeight: 48, justifyContent: 'center' },
  headerRight: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  headerTitle: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  card: { borderRadius: radius.xl, padding: spacing.base },
  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%', borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.lg, paddingRight: spacing.xs, paddingTop: spacing.sm },
  sheetBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.base },
});
