import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PostCard } from '../components/PostCard';
import { demoPosts } from '../data/demo';

export function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View><Text style={styles.locationLabel}>우리 동네</Text><Text style={styles.location}>서울 중구 ⌄</Text></View>
        <View style={styles.avatar}><Text>🙂</Text></View>
      </View>
      <View style={styles.hero}>
        <View style={styles.heroCopy}><Text style={styles.eyebrow}>오늘 우리 동네에서</Text><Text style={styles.heroTitle}>버려질 뻔한 식재료가{`\n`}12개나 구조됐어요!</Text><Text style={styles.heroLink}>나의 절약 기록 보기 →</Text></View>
        <Text style={styles.heroEmoji}>🌱</Text>
      </View>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>가까운 이웃 냉장고</Text><Text style={styles.filter}>거리순 ⌄</Text></View>
      <View style={styles.chips}><Text style={[styles.chip, styles.chipActive]}>전체</Text><Text style={styles.chip}>나눔</Text><Text style={styles.chip}>교환</Text><Text style={styles.chip}>한끼</Text></View>
      {demoPosts.map((post) => <PostCard key={post.id} post={post} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 110 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 18 },
  locationLabel: { fontSize: 12, color: '#74867D' }, location: { fontSize: 21, fontWeight: '900', color: '#173C2D', marginTop: 2 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E5F5EA', alignItems: 'center', justifyContent: 'center' },
  hero: { minHeight: 158, borderRadius: 24, backgroundColor: '#166B47', padding: 22, flexDirection: 'row', overflow: 'hidden', marginBottom: 26 },
  heroCopy: { flex: 1, zIndex: 2 }, eyebrow: { color: '#BFE8CE', fontSize: 13, fontWeight: '700' }, heroTitle: { color: '#FFF', fontSize: 22, lineHeight: 30, fontWeight: '900', marginTop: 7 },
  heroLink: { color: '#E6F7EC', fontSize: 12, marginTop: 12, fontWeight: '700' }, heroEmoji: { fontSize: 82, position: 'absolute', right: -4, bottom: -7, opacity: 0.9 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { color: '#173C2D', fontSize: 20, fontWeight: '900' }, filter: { color: '#63746B', fontSize: 13 },
  chips: { flexDirection: 'row', marginTop: 14, marginBottom: 16 }, chip: { marginRight: 8, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 18, color: '#5D6D64', backgroundColor: '#EDF2EF', overflow: 'hidden', fontSize: 13, fontWeight: '700' },
  chipActive: { color: '#FFF', backgroundColor: '#19734B' },
});
