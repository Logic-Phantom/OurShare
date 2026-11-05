import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { useColors } from '../theme';
import { radius, spacing } from '../tokens';
import { AppText } from './AppText';
import { PrimaryButton, SecondaryButton, type IconName } from './Buttons';

export function EmptyState({ icon, title, description, action }: { icon: IconName; title: string; description?: string; action?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.greenSoft }]}>
        <Ionicons name={icon} size={32} color={c.greenDark} />
      </View>
      <AppText variant="sectionTitle" align="center">{title}</AppText>
      {description ? <AppText tone="secondary" align="center">{description}</AppText> : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="alert-circle-outline"
      title="문제가 생겼어요"
      description={message}
      action={onRetry ? <SecondaryButton label="다시 시도" onPress={onRetry} /> : undefined}
    />
  );
}

/** The soft yellow card from the design: a short note with an optional action. */
export function HintCard({ children, icon = 'bulb', onPress, label }: { children: ReactNode; icon?: IconName; onPress?: () => void; label?: string }) {
  const c = useColors();
  const body = (
    <>
      <Ionicons name={icon} size={24} color={c.yellow} />
      <View style={styles.hintText}>{children}</View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={c.yellow} /> : null}
    </>
  );
  const style = [styles.hint, { backgroundColor: c.hint }];
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={style}>
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}

export function InlineMessage({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: string }) {
  const c = useColors();
  return (
    <View style={[styles.inline, { backgroundColor: tone === 'warning' ? c.dangerSoft : c.surfaceMuted }]}>
      <Ionicons name={tone === 'warning' ? 'alert-circle' : 'information-circle'} size={18} color={tone === 'warning' ? c.danger : c.textSecondary} />
      <AppText variant="caption" style={styles.hintText}>{children}</AppText>
    </View>
  );
}

export function ConfirmDialog({ visible, title, message, confirmLabel, danger, onConfirm, onCancel }: { visible: boolean; title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const c = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.dialogWrap}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onCancel} accessibilityRole="button" accessibilityLabel="취소" />
        <View style={[styles.dialog, { backgroundColor: c.surface }]} accessibilityViewIsModal>
          <AppText variant="sectionTitle">{title}</AppText>
          <AppText tone="secondary">{message}</AppText>
          <View style={styles.dialogActions}>
            <SecondaryButton label="취소" onPress={onCancel} style={styles.dialogButton} />
            {danger ? (
              <SecondaryButton label={confirmLabel} tone="danger" onPress={onConfirm} style={styles.dialogButton} testID="confirm-yes" />
            ) : (
              <PrimaryButton label={confirmLabel} onPress={onConfirm} style={styles.dialogButton} testID="confirm-yes" />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.xl, padding: spacing.base },
  hintText: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.md, padding: spacing.md },
  dialogWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  dialog: { width: '100%', maxWidth: 400, borderRadius: radius.xxl, padding: spacing.xl, gap: spacing.md },
  dialogActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  dialogButton: { flex: 1, minHeight: 48 },
});
