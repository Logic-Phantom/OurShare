import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

import { BroomIllustration, useColors } from '@/design-system';
import { categoryInfo } from '@/features/chores/catalog';

export function ChoreIcon({ category, size = 48 }: { category: string; size?: number }) {
  const c = useColors();
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: c.greenSoft }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {category === 'CLEANING' && size >= 72 ? (
        <BroomIllustration size={size * 0.62} />
      ) : (
        <MaterialCommunityIcons name={categoryInfo(category).icon} size={size * 0.52} color={c.greenDark} />
      )}
    </View>
  );
}
