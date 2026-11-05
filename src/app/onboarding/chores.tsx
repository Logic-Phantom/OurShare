import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChoreIcon } from '@/components/ChoreIcon';
import { StepDots } from '@/components/StepDots';
import { AppText, Card, CheckCircle, InlineMessage, PrimaryButton, Screen, ScreenHeader, spacing, TextButton, useColors } from '@/design-system';
import { CHORE_TEMPLATES, definitionFromTemplate, describeWeekdays } from '@/features/chores/catalog';
import { createHouseholdFromSetup } from '@/features/household/household-service';
import { useSetupDraft } from '@/features/household/setup-draft';
import { useAppState } from '@/hooks/app-state';
import { logError } from '@/utils/log';

/** Everything except the daily dishes starts selected: a usable week with one tap. */
const INITIALLY_SELECTED = new Set(CHORE_TEMPLATES.flatMap((template, index) => (template.weekdays.length < 7 ? [index] : [])));

export default function SetupChoresScreen() {
  const c = useColors();
  const router = useRouter();
  const draft = useSetupDraft();
  const { updateSettings, notifyDataChanged } = useAppState();
  const [selected, setSelected] = useState<ReadonlySet<number>>(INITIALLY_SELECTED);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggle = (index: number) => {
    const next = new Set(selected);
    if (!next.delete(index)) next.add(index);
    setSelected(next);
  };

  const finish = async (withChores: boolean) => {
    setSaving(true);
    setFailed(false);
    try {
      const chosen = withChores ? CHORE_TEMPLATES.filter((_, index) => selected.has(index)) : [];
      const meMemberId = await createHouseholdFromSetup({
        householdName: draft.householdName,
        sharePreset: draft.preset,
        members: draft.members.map((member, index) => ({ ...member, targetSharePercent: draft.shares[index] as number })),
        chores: chosen.map((template, index) => ({ ...definitionFromTemplate(template, index), fixedMemberIndex: null })),
      });
      await updateSettings({ onboardingDone: true, meMemberId });
      notifyDataChanged();
      router.replace('/');
    } catch (error) {
      logError('onboarding.finish', error);
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader title="집안일 고르기" />
      <Screen
        contentStyle={styles.content}
        footer={
          <>
            <PrimaryButton label={`${selected.size}개로 시작하기`} onPress={() => finish(true)} disabled={saving || selected.size === 0} testID="finish-setup" />
            <StepDots current={2} total={3} />
            <TextButton label="나중에 고를게요" onPress={() => finish(false)} testID="finish-empty" />
          </>
        }>
        <AppText tone="secondary">요일과 부담 점수, 담당 방식은 나중에 집안일 탭에서 바꿀 수 있어요. 처음에는 모두 자동 배정이에요.</AppText>
        {failed ? <InlineMessage tone="warning">저장하지 못했어요. 다시 시도해 주세요.</InlineMessage> : null}
        {CHORE_TEMPLATES.map((template, index) => {
          const isSelected = selected.has(index);
          const details = `${describeWeekdays(template.weekdays.reduce<number>((mask, day) => mask | (1 << day), 0), 1)} · 부담 ${template.workloadPoints}점`;
          return (
            <Pressable key={template.title} onPress={() => toggle(index)} accessibilityRole="checkbox" accessibilityLabel={`${template.title}, ${details}`} accessibilityState={{ checked: isSelected }}>
              <Card style={styles.row}>
                <ChoreIcon category={template.category} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{template.title}</AppText>
                  <AppText variant="caption" tone="secondary">{details}</AppText>
                </View>
                <CheckCircle checked={isSelected} label={template.title} />
              </Card>
            </Pressable>
          );
        })}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.sm, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
});
