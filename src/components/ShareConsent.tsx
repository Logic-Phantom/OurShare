import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, CheckCircle, spacing } from '@/design-system';

/** What sharing sends, where, and for how long. Shown before anything leaves the device (D-095). */
export function ShareConsent({ adult, agreed, onAdult, onAgreed }: { adult: boolean; agreed: boolean; onAdult: (value: boolean) => void; onAgreed: (value: boolean) => void }) {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <AppText variant="sectionTitle">공유하면 서버에 저장되는 정보</AppText>
        <AppText variant="body">· 집 이름, 구성원 이름(별칭)·그림·색·비율{'\n'}· 집안일, 주간 일정, 완료·건너뛰기 기록{'\n'}· 이 기기의 공유 계정 식별자(이메일·전화번호는 받지 않아요)</AppText>
        <AppText variant="caption" tone="secondary">
          목적: 같은 집 구성원의 기기끼리 일정을 맞추기 위해서만 써요.{'\n'}
          저장: Supabase(미국 회사)의 서울 서버. 처리 위탁과 국외 이전 내용은 처리방침에 있어요.{'\n'}
          보관: 공유를 그만두면 바로 지워요. 집의 모든 구성원이 12개월 동안 쓰지 않으면 지워요.{'\n'}
          알림 설정, 이 기기 사용자 표시, 알림함은 보내지 않아요.
        </AppText>
        <Pressable onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} accessibilityRole="link">
          <AppText variant="captionStrong" tone="green">개인정보 처리방침 보기</AppText>
        </Pressable>
      </Card>
      <Pressable onPress={() => onAdult(!adult)} accessibilityRole="checkbox" accessibilityState={{ checked: adult }} style={styles.row} testID="consent-adult">
        <CheckCircle checked={adult} label="만 14세 이상이에요" />
        <AppText variant="body" style={styles.flex}>만 14세 이상이에요</AppText>
      </Pressable>
      <Pressable onPress={() => onAgreed(!agreed)} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} style={styles.row} testID="consent-agree">
        <CheckCircle checked={agreed} label="위 내용에 동의해요" />
        <AppText variant="body" style={styles.flex}>위 정보를 서버에 저장하는 데 동의해요</AppText>
      </Pressable>
      {!adult ? <AppText variant="caption" tone="secondary">만 14세 미만은 공유 기능을 쓸 수 없어요. 이 기기 안에서는 모든 기능을 그대로 쓸 수 있어요.</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  flex: { flex: 1 },
});
