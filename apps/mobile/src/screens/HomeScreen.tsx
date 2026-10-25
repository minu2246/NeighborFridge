import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PostCard } from '../components/PostCard';
import { FoodPost, Neighborhood } from '../types';

export function HomeScreen({ posts, neighborhood, only, onShowAll, onNeighborhoodChange, onSelectPost }: { posts: FoodPost[]; neighborhood: Neighborhood | null; only?: 'mine' | 'liked'; onShowAll?: () => void; onNeighborhoodChange: (value: Neighborhood) => Promise<void>; onSelectPost: (post: FoodPost) => void }) {
  const [tradeFilter, setTradeFilter] = useState<'전체' | FoodPost['type']>('전체');
  const [sort, setSort] = useState<'distance' | 'expiry'>('distance');
  const visiblePosts = useMemo(() => posts
    .filter((post) => only === 'mine' ? post.isMine : only === 'liked' ? post.liked : true)
    .filter((post) => Number.parseFloat(post.distance) <= (neighborhood?.radiusKm ?? 3))
    .filter((post) => tradeFilter === '전체' || post.type === tradeFilter)
    .sort((a, b) => sort === 'distance'
      ? Number.parseFloat(a.distance) - Number.parseFloat(b.distance)
      : expiryDays(a) - expiryDays(b)), [posts, neighborhood?.radiusKm, sort, tradeFilter, only]);
  const filters: { label: string; value: '전체' | FoodPost['type'] }[] = [
    { label: '전체', value: '전체' }, { label: '나눔', value: '나눔' },
    { label: '교환', value: '교환' }, { label: '한끼', value: '한끼 나눔' },
  ];
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View><Text style={styles.locationLabel}>우리 동네 · 인증 완료</Text><Text style={styles.location}>{neighborhood?.name ?? '동네 확인 중'} ✓</Text></View>
        <View style={styles.avatar}><Text>🙂</Text></View>
      </View>
      <View style={styles.hero}>
        <View style={styles.heroCopy}><Text style={styles.eyebrow}>오늘 우리 동네에서</Text><Text style={styles.heroTitle}>버려질 뻔한 식재료가{`\n`}12개나 구조됐어요!</Text><Text style={styles.heroLink}>나의 절약 기록 보기 →</Text></View>
        <Text style={styles.heroEmoji}>🌱</Text>
      </View>
      {only ? <View style={styles.mineBanner}><View><Text style={styles.mineTitle}>{only === 'mine' ? '내 게시물' : '관심 목록'}</Text><Text style={styles.mineText}>{only === 'mine' ? '게시물을 눌러 거래 상태를 변경할 수 있어요.' : '찜한 게시물 중 거래 중인 것만 보여요.'}</Text></View><Pressable onPress={onShowAll}><Text style={styles.showAll}>전체 보기</Text></Pressable></View> : null}
      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>{only === 'mine' ? '내가 등록한 식재료' : only === 'liked' ? '찜한 식재료' : '가까운 이웃 냉장고'}</Text><Text style={styles.resultCount}>{visiblePosts.length}개의 식재료</Text></View><Pressable onPress={() => setSort((value) => value === 'distance' ? 'expiry' : 'distance')}><Text style={styles.filter}>{sort === 'distance' ? '거리순' : '소비기한순'} ↕</Text></Pressable></View>
      <View style={styles.radiusRow}><Text style={styles.radiusLabel}>검색 반경</Text>{([1, 3, 5] as const).map((radius) => <Pressable key={radius} onPress={() => neighborhood && void onNeighborhoodChange({ ...neighborhood, radiusKm: radius })}><Text style={[styles.radius, neighborhood?.radiusKm === radius && styles.radiusActive]}>{radius}km</Text></Pressable>)}</View>
      <View style={styles.chips}>{filters.map((filter) => <Pressable key={filter.value} onPress={() => setTradeFilter(filter.value)}><Text style={[styles.chip, tradeFilter === filter.value && styles.chipActive]}>{filter.label}</Text></Pressable>)}</View>
      {visiblePosts.map((post) => <PostCard key={post.id} post={post} onPress={() => onSelectPost(post)} />)}
      {visiblePosts.length === 0 ? <Text style={styles.empty}>선택한 조건에 맞는 식재료가 아직 없어요.</Text> : null}
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
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { color: '#173C2D', fontSize: 20, fontWeight: '900' }, resultCount: { color: '#85958C', fontSize: 11, marginTop: 4 }, filter: { color: '#19734B', fontSize: 13, fontWeight: '800', backgroundColor: '#E8F3EC', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, overflow: 'hidden' },
  chips: { flexDirection: 'row', marginTop: 14, marginBottom: 16 }, chip: { marginRight: 8, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 18, color: '#5D6D64', backgroundColor: '#EDF2EF', overflow: 'hidden', fontSize: 13, fontWeight: '700' },
  chipActive: { color: '#FFF', backgroundColor: '#19734B' },
  radiusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 }, radiusLabel: { color: '#7B8B82', fontSize: 12, marginRight: 8 }, radius: { color: '#617269', backgroundColor: '#EDF2EF', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, marginRight: 6, overflow: 'hidden', fontSize: 12, fontWeight: '800' }, radiusActive: { color: '#FFF', backgroundColor: '#19734B' }, empty: { textAlign: 'center', color: '#829087', paddingVertical: 35 },
  mineBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5F5EA', borderRadius: 16, padding: 15, marginBottom: 18 }, mineTitle: { color: '#174D35', fontWeight: '900', fontSize: 17 }, mineText: { color: '#5D776A', fontSize: 11, marginTop: 3 }, showAll: { color: '#19734B', fontWeight: '900', marginLeft: 10 },
});

function expiryDays(post: FoodPost): number {
  if (post.expiryDate && post.expiryDate !== '2099-12-31') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((new Date(`${post.expiryDate}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
  }
  if (post.dDay === '오늘') return 0;
  const match = post.dDay.match(/D-(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}
