import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, useColors, type IconName } from '@/design-system';

const icon = (outline: IconName, filled: IconName) =>
  function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? filled : outline} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const c = useColors();
  // Android draws edge-to-edge: the bar must sit above the system navigation buttons.
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.greenDark,
        tabBarInactiveTintColor: c.textTertiary,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: 64 + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom + 6 },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        sceneStyle: { backgroundColor: c.background },
      }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="schedule" options={{ title: '일정', tabBarIcon: icon('calendar-outline', 'calendar') }} />
      <Tabs.Screen name="chores" options={{ title: '집안일', tabBarIcon: icon('sparkles-outline', 'sparkles') }} />
      <Tabs.Screen name="household" options={{ title: '우리집', tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
