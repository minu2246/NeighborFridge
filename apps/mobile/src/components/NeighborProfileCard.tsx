import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { getUserProfile, listReceivedReviews } from '../api/client';
import { countPraises, mannerFace, ratingLabel } from '../lib/reviews';
import { NeighborProfile, ReceivedReview } from '../types';

// 게시물 작성자 등 다른 이웃의 매너 온도·칭찬·후기 (정식 모드 + 로그인 필요)
export function NeighborProfileCard({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<NeighborProfile | null | undefined>(undefined);
  const [received, setReceived] = useState<ReceivedReview[]>([]);
  useEffect(() => {
    void getUserProfile(userId).then(setProfile).catch(() => setProfile(null));
    void listReceivedReviews(userId).then(setReceived).catch(() => setReceived([]));
  }, [userId]);
  if (profile === undefined) return <ActivityIndicator color="#19734B" style={styles.card} />;
  if (!profile) return <Text style={[styles.card, styles.muted]}>로그인하면 이웃의 매너 온도와 후기를 볼 수 있어요</Text>;
  const praises = countPraises(received).slice(0, 3);
  return <View style={styles.card}>
    <View style={styles.top}><Text style={styles.label}>매너 온도</Text><Text style={styles.temp}>{profile.mannerTemperature.toFixed(1)}°C {mannerFace(profile.mannerTemperature)}</Text></View>
    <View style={styles.track}><View style={[styles.fill, { width: `${profile.mannerTemperature}%` }]} /></View>
    <Text style={styles.muted}>{profile.neighborhoodName ?? '동네 미설정'} · 나눔 완료 {profile.completedPosts} · 받은 후기 {profile.reviewCount}</Text>
    {praises.map(([praise, count]) => <Text key={praise} style={styles.praise}>👍 {praise} <Text style={styles.count}>{count}</Text></Text>)}
    {received.slice(0, 3).map((r) => <Text key={`${r.reviewerNickname}-${r.createdAt}`} style={styles.review}>{r.reviewerNickname} · {r.itemName} · <Text style={r.rating < 0 ? styles.bad : styles.good}>{ratingLabel(r.rating)}</Text></Text>)}
  </View>;
}
const styles = StyleSheet.create({ card: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E6ECE8' }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, label: { color: '#385044', fontWeight: '800' }, temp: { color: '#D4772B', fontWeight: '900', fontSize: 16 }, track: { height: 7, borderRadius: 4, backgroundColor: '#EDF2EF', marginVertical: 8, overflow: 'hidden' }, fill: { height: 7, backgroundColor: '#E8964A' }, muted: { color: '#85958C', fontSize: 11 }, praise: { color: '#385044', fontSize: 12, marginTop: 6 }, count: { color: '#19734B', fontWeight: '900' }, review: { color: '#61746A', fontSize: 11, marginTop: 5 }, good: { color: '#19734B' }, bad: { color: '#B54C3C' } });
