import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { FoodPost } from '../types';

export function PostCard({ post, onPress }: { post: FoodPost; onPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.image, { backgroundColor: post.color }]}>{post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={{ width: '100%', height: '100%', borderRadius: 14 }}/> : <Text style={styles.emoji}>{post.emoji}</Text>}</View>
      <View style={styles.content}>
        <View style={styles.topline}>
          <Text style={styles.name}>{post.name}</Text>
          <Text style={[styles.dday, post.dDay === '오늘' && styles.urgent]}>{post.dDay}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{post.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.badge}>{post.type}</Text>
          <Text style={styles.meta}>{post.distance} · {post.place}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', backgroundColor: '#FFF', padding: 12, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#E7EFEA' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  image: { width: 92, height: 92, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 46 }, content: { flex: 1, marginLeft: 14 },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 17, fontWeight: '800', color: '#173C2D' },
  dday: { color: '#D26937', fontWeight: '800', fontSize: 13 }, urgent: { color: '#D84343' },
  title: { color: '#50655B', fontSize: 14, lineHeight: 20, marginTop: 5, minHeight: 40 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  badge: { color: '#19734B', backgroundColor: '#E5F5EA', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  meta: { color: '#829087', fontSize: 11, marginLeft: 7, flex: 1 },
});
