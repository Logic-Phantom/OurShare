import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { EmptyState, PrimaryButton, Screen, ScreenHeader, useColors } from '@/design-system';

export default function ScheduleScreen() {
  const c = useColors();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScreenHeader title="주간 일정" showBack={false} />
      <Screen>
        <EmptyState
          icon="calendar-outline"
          title="아직 만들어진 일정이 없어요"
          description="먼저 집안일의 요일과 담당 방식을 정해 주세요."
          action={<PrimaryButton label="집안일 보기" onPress={() => router.push('/chores')} />}
        />
      </Screen>
    </View>
  );
}
