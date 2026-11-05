import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ChoreForm } from '@/components/ChoreForm';
import { ErrorState, ScreenHeader } from '@/design-system';
import { getChore } from '@/features/chores/chore-repository';
import { loadHouseholdView } from '@/features/household/household-service';
import { useLoader } from '@/hooks/use-loader';

export default function EditChoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useLoader(async () => {
    const [view, chore] = await Promise.all([loadHouseholdView(), getChore(id)]);
    return { view, chore };
  }, [id]);

  if (data?.view && data.chore) return <ChoreForm key={data.chore.id} view={data.view} chore={data.chore} />;
  if (loading && !error) return null;
  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="집안일 설정" />
      <ErrorState message={error ? '불러오지 못했어요.' : '이 집안일을 찾을 수 없어요.'} onRetry={error ? reload : undefined} />
    </View>
  );
}
