import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Confetti, DoneHouseIllustration, InlineMessage, PrimaryButton, spacing, TextButton, useColors } from '@/design-system';
import { getScheduledChore } from '@/features/week-plan/week-plan-repository';
import { applyChoreAction } from '@/features/week-plan/week-plan-service';
import { loadHouseholdView } from '@/features/household/household-service';
import { useAppState } from '@/hooks/app-state';
import { useLoader } from '@/hooks/use-loader';
import { logError } from '@/utils/log';

export default function CompletedScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notifyDataChanged } = useAppState();
  const [failed, setFailed] = useState(false);
  const { data } = useLoader(async () => ({ chore: await getScheduledChore(id), view: await loadHouseholdView() }), [id]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  /** The design's screen had no way back; a mistaken tap should be one tap to fix. */
  const undo = async () => {
    if (!data?.view || !data.chore) return;
    try {
      await applyChoreAction(data.view.household.id, data.chore.id, { kind: 'undoComplete' });
      notifyDataChanged();
      close();
    } catch (error) {
      logError('completed.undo', error);
      setFailed(true);
    }
  };

  const title = data?.chore?.title ?? '집안일';
  return (
    <View style={[styles.flex, { backgroundColor: c.background, paddingTop: insets.top + spacing.xl, paddingBottom: Math.max(insets.bottom, spacing.base) }]}>
      <View style={styles.body}>
        <Confetti />
        <View style={[styles.check, { backgroundColor: c.green }]}>
          <Ionicons name="checkmark" size={64} color="#FFFFFF" />
        </View>
        <AppText variant="display" align="center" accessibilityLiveRegion="polite">{title} 완료!</AppText>
        <AppText tone="secondary" align="center">다음 할 일도{'\n'}함께해요 😊</AppText>
      </View>
      <DoneHouseIllustration width={320} />
      <View style={styles.actions}>
        {failed ? <InlineMessage tone="warning">되돌리지 못했어요. 일정에서 다시 시도해 주세요.</InlineMessage> : null}
        <PrimaryButton label="확인" onPress={close} testID="completed-ok" />
        {data?.chore?.status === 'DONE' ? <TextButton label="실수였어요, 되돌리기" onPress={undo} testID="completed-undo" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  body: { alignItems: 'center', gap: spacing.base, paddingHorizontal: spacing.lg },
  check: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', marginTop: -spacing.lg },
  actions: { alignSelf: 'stretch', paddingHorizontal: spacing.lg, gap: spacing.sm },
});
