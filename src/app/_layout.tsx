import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { darkColors, ErrorState, fonts, lightColors, useColors } from '@/design-system';
import { AppStateProvider, useAppState } from '@/hooks/app-state';

SplashScreen.preventAutoHideAsync().catch(() => {});

const FONT_FILES = {
  [fonts.regular]: require('@/assets/fonts/Pretendard-Regular.otf'),
  [fonts.medium]: require('@/assets/fonts/Pretendard-Medium.otf'),
  [fonts.semibold]: require('@/assets/fonts/Pretendard-SemiBold.otf'),
  [fonts.bold]: require('@/assets/fonts/Pretendard-Bold.otf'),
};

function StartupEffects() {
  const { ready, dbError, settings } = useAppState();
  const router = useRouter();
  const segments = useSegments();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  useEffect(() => {
    if (!ready || dbError || settings.onboardingDone) return;
    if (segments[0] !== 'onboarding') router.replace('/onboarding');
  }, [ready, dbError, settings.onboardingDone, segments, router]);
  return null;
}

/** Never resets data when the database cannot open: a retry is all it offers. */
function DatabaseError() {
  const { retry } = useAppState();
  const c = useColors();
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.background }}>
      <ErrorState message="저장된 내용을 불러오지 못했어요. 데이터는 지우지 않았어요. 앱을 다시 열거나 아래 버튼을 눌러 주세요." onRetry={retry} />
    </View>
  );
}

function Navigator() {
  const { dbError } = useAppState();
  const c = useColors();
  if (dbError) return <DatabaseError />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="chore/new" />
      <Stack.Screen name="chore/[id]" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  // A font that fails to load falls back to the system font; never block the app on it.
  if (!fontsLoaded && !fontError) return null;

  const c = scheme === 'dark' ? darkColors : lightColors;
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <SafeAreaProvider>
      <ThemeProvider value={{ ...navTheme, colors: { ...navTheme.colors, background: c.background, card: c.surface, text: c.textPrimary, primary: c.greenDark, border: c.border } }}>
        <AppStateProvider>
          <StartupEffects />
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Navigator />
        </AppStateProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
