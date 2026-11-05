import { ChoreForm } from '@/components/ChoreForm';
import { loadHouseholdView } from '@/features/household/household-service';
import { useLoader } from '@/hooks/use-loader';

export default function NewChoreScreen() {
  const { data } = useLoader(loadHouseholdView);
  return data ? <ChoreForm view={data} /> : null;
}
