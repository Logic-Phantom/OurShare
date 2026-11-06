import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StepDots } from '@/components/StepDots';
import { AppText, InlineMessage, PrimaryButton, Screen, spacing, TextButton, useColors, WelcomeIllustration } from '@/design-system';
import { createHouseholdFromSetup } from '@/features/household/household-service';
import { useAppState } from '@/hooks/app-state';
import { logError } from '@/utils/log';

export default function WelcomeScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { updateSettings, notifyDataChanged } = useAppState();
  const [failed, setFailed] = useState(false);

  /** Skipping still needs a household, so it creates the smallest one; everything can be changed later. */
  const skip = async () => {
    try {
      const meMemberId = await createHouseholdFromSetup({
        householdName: '우리집',
        sharePreset: 'EQUAL',
        members: [{ displayName: '나', colorKey: 'blue', avatarKey: 'short', targetSharePercent: 100 }],
        chores: [],
      });
      await updateSettings({ onboardingDone: true, meMemberId });
      notifyDataChanged();
      router.replace('/');
    } catch (error) {
      logError('onboarding.skip', error);
      setFailed(true);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <Screen
        contentStyle={styles.content}
        footer={
          <>
            <PrimaryButton label="시작하기" onPress={() => router.push('/onboarding/members')} testID="start" />
            <StepDots current={0} total={3} />
            <TextButton label="초대 코드로 참여하기" onPress={() => router.push('/join')} testID="open-join" />
            <TextButton label="건너뛰기" onPress={skip} testID="skip" />
          </>
        }>
        <View style={styles.copy}>
          <AppText variant="display" align="center">이번 주 집안일,{'\n'}자동으로 공평하게{'\n'}나눠요.</AppText>
          <AppText tone="secondary" align="center">우리의 집안일,{'\n'}우리의 몫</AppText>
        </View>
        <View style={styles.art}>
          <WelcomeIllustration width={Math.min(width - spacing.xxl * 2, 340)} />
        </View>
        {failed ? <InlineMessage tone="warning">시작하지 못했어요. 다시 시도해 주세요.</InlineMessage> : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: spacing.xl },
  copy: { gap: spacing.md },
  art: { alignItems: 'center' },
});
