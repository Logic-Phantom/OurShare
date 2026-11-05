import { Stack } from 'expo-router';

import { useColors } from '@/design-system';
import { SetupDraftProvider } from '@/features/household/setup-draft';

export default function OnboardingLayout() {
  const c = useColors();
  return (
    <SetupDraftProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }} />
    </SetupDraftProvider>
  );
}
