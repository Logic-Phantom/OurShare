import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, EmptyState, Screen, ScreenHeader, spacing, useColors } from '@/design-system';
import { LEGAL_DOCS } from '@/features/legal/documents';

export default function LegalScreen() {
  const c = useColors();
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const document = LEGAL_DOCS[doc];
  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      <ScreenHeader title={document?.title ?? '문서'} />
      {document ? (
        <Screen contentStyle={styles.content}>
          <AppText variant="caption" tone="secondary">시행일 {document.updatedAt}</AppText>
          {document.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <AppText variant="sectionTitle">{section.heading}</AppText>
              <AppText variant="body" selectable>{section.body}</AppText>
            </View>
          ))}
        </Screen>
      ) : (
        <EmptyState icon="document-outline" title="문서를 찾을 수 없어요" description="설정 화면에서 다시 열어 주세요." />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.sm, gap: spacing.lg },
  section: { gap: spacing.xs },
});
