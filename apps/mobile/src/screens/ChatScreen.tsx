import { ScrollView, StyleSheet, Text, View } from 'react-native';
const chats = [
  { emoji: '🥬', name: '초록이웃', item: '청경채', message: '네, 시청역 4번 출구에서 만나요!', time: '오후 8:12', unread: 2 },
  { emoji: '🥚', name: '살림초보', item: '유정란 6구', message: '바나나 사진 보내드릴게요 😊', time: '오후 6:40', unread: 0 },
  { emoji: '🍲', name: '정동밥상', item: '소고기 미역국', message: '맛있게 드세요!', time: '어제', unread: 0 },
];
export function ChatScreen() { return <ScrollView contentContainerStyle={styles.page}>
  <Text style={styles.title}>이웃 대화</Text><Text style={styles.subtitle}>따뜻하고 안전하게 약속을 정해요.</Text>
  {chats.map((chat) => <View style={styles.row} key={chat.name}>
    <View style={styles.avatar}><Text style={styles.emoji}>{chat.emoji}</Text></View><View style={styles.copy}>
      <View style={styles.top}><Text style={styles.name}>{chat.name}</Text><Text style={styles.time}>{chat.time}</Text></View>
      <Text style={styles.item}>{chat.item}</Text><Text style={styles.message} numberOfLines={1}>{chat.message}</Text>
    </View>{chat.unread > 0 && <Text style={styles.unread}>{chat.unread}</Text>}
  </View>)}
  <View style={styles.safety}><Text style={styles.safetyTitle}>🛡️ 안전한 거래 약속</Text><Text style={styles.safetyText}>사람이 많은 공공장소에서 만나고, 집 주소는 공유하지 마세요.</Text></View>
  </ScrollView>; }
const styles = StyleSheet.create({ page: { padding: 22, paddingBottom: 110 }, title: { marginTop: 14, fontSize: 28, fontWeight: '900', color: '#173C2D' }, subtitle: { color: '#74867D', marginTop: 6, marginBottom: 20 }, row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EDF2EF', paddingVertical: 17 }, avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#EAF5ED', alignItems: 'center', justifyContent: 'center' }, emoji: { fontSize: 27 }, copy: { flex: 1, marginLeft: 13 }, top: { flexDirection: 'row', justifyContent: 'space-between' }, name: { fontSize: 16, fontWeight: '800', color: '#213D31' }, time: { fontSize: 11, color: '#93A198' }, item: { fontSize: 11, color: '#2A8058', fontWeight: '700', marginTop: 3 }, message: { color: '#64756C', marginTop: 4, fontSize: 13 }, unread: { backgroundColor: '#E95F4F', color: '#FFF', fontWeight: '800', borderRadius: 12, overflow: 'hidden', minWidth: 23, textAlign: 'center', paddingVertical: 3 }, safety: { marginTop: 26, padding: 18, borderRadius: 16, backgroundColor: '#FFF8DF' }, safetyTitle: { fontWeight: '900', color: '#6E5B18' }, safetyText: { color: '#887634', fontSize: 12, lineHeight: 19, marginTop: 7 } });
