import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { listLocalMessages, sendLocalMessage } from '../api/client';
import { ChatMessage, ChatTarget } from '../types';

const chats = [
  { id: '1', emoji: '🥬', name: '초록이웃', item: '청경채', message: '네, 시청역 4번 출구에서 만나요!', time: '오후 8:12', unread: 2 },
  { id: '2', emoji: '🥚', name: '살림초보', item: '유정란 6구', message: '바나나 사진 보내드릴게요 😊', time: '오후 6:40', unread: 0 },
  { id: '3', emoji: '🍲', name: '정동밥상', item: '소고기 미역국', message: '맛있게 드세요!', time: '어제', unread: 0 },
];

export function ChatScreen({ startTarget }: { startTarget?: ChatTarget }) {
  const [selected, setSelected] = useState<ChatTarget | null>(startTarget ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { setSelected(startTarget ?? null); }, [startTarget]);
  useEffect(() => {
    if (!selected) return;
    void listLocalMessages<ChatMessage>(selected.roomId).then(setMessages).catch(() => setMessages([]));
  }, [selected?.roomId]);
  useEffect(() => {
    if (Platform.OS !== 'android' || !selected) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setSelected(null); return true; });
    return () => subscription.remove();
  }, [selected]);
  async function send() {
    const message = draft.trim();
    if (!selected || !message || sending) return;
    setSending(true);
    try {
      const saved = await sendLocalMessage<ChatMessage>(selected.roomId, 'me', message);
      setMessages((current) => [...current, saved]); setDraft('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } finally { setSending(false); }
  }
  if (selected) return <KeyboardAvoidingView style={styles.room} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.roomHeader}><Pressable onPress={() => setSelected(null)}><Text style={styles.back}>‹</Text></Pressable><View><Text style={styles.roomName}>{selected.neighborName}</Text><Text style={styles.roomItem}>{selected.item}</Text></View></View>
    <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled"><Text style={styles.date}>오늘</Text>{messages.length === 0 ? <Text style={styles.empty}>첫 메시지를 보내 약속을 잡아보세요.</Text> : messages.map((entry) => <View key={entry.id} style={[styles.bubble, entry.sender === 'me' ? styles.mine : styles.theirs]}><Text style={[styles.bubbleText, entry.sender === 'me' && styles.mineText]}>{entry.message}</Text></View>)}</ScrollView>
    <View style={styles.composer}><TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => void send()} returnKeyType="send" style={styles.composeInput} placeholder="따뜻한 메시지를 입력하세요" placeholderTextColor="#99A69F" /><Pressable style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]} onPress={() => void send()} disabled={!draft.trim() || sending}>{sending ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.sendText}>↑</Text>}</Pressable></View>
  </KeyboardAvoidingView>;
  return <ScrollView contentContainerStyle={styles.page}><Text style={styles.title}>이웃 대화</Text><Text style={styles.subtitle}>따뜻하고 안전하게 약속을 정해요.</Text>
    {chats.map((chat) => <Pressable style={styles.row} key={chat.name} onPress={() => setSelected({ roomId: `demo-${chat.id}`, item: chat.item, emoji: chat.emoji, neighborName: chat.name })}><View style={styles.avatar}><Text style={styles.emoji}>{chat.emoji}</Text></View><View style={styles.copy}><View style={styles.top}><Text style={styles.name}>{chat.name}</Text><Text style={styles.time}>{chat.time}</Text></View><Text style={styles.item}>{chat.item}</Text><Text style={styles.message} numberOfLines={1}>{chat.message}</Text></View>{chat.unread > 0 && <Text style={styles.unread}>{chat.unread}</Text>}</Pressable>)}
    <View style={styles.safety}><Text style={styles.safetyTitle}>🛡️ 안전한 거래 약속</Text><Text style={styles.safetyText}>사람이 많은 공공장소에서 만나고, 집 주소는 공유하지 마세요.</Text></View>
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 22, paddingBottom: 110 }, title: { marginTop: 14, fontSize: 28, fontWeight: '900', color: '#173C2D' }, subtitle: { color: '#74867D', marginTop: 6, marginBottom: 20 }, row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EDF2EF', paddingVertical: 17 }, avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#EAF5ED', alignItems: 'center', justifyContent: 'center' }, emoji: { fontSize: 27 }, copy: { flex: 1, marginLeft: 13 }, top: { flexDirection: 'row', justifyContent: 'space-between' }, name: { fontSize: 16, fontWeight: '800', color: '#213D31' }, time: { fontSize: 11, color: '#93A198' }, item: { fontSize: 11, color: '#2A8058', fontWeight: '700', marginTop: 3 }, message: { color: '#64756C', marginTop: 4, fontSize: 13 }, unread: { backgroundColor: '#E95F4F', color: '#FFF', fontWeight: '800', borderRadius: 12, overflow: 'hidden', minWidth: 23, textAlign: 'center', paddingVertical: 3 }, safety: { marginTop: 26, padding: 18, borderRadius: 16, backgroundColor: '#FFF8DF' }, safetyTitle: { fontWeight: '900', color: '#6E5B18' }, safetyText: { color: '#887634', fontSize: 12, lineHeight: 19, marginTop: 7 }, room: { flex: 1, backgroundColor: '#F7FAF8', paddingBottom: 148 }, roomHeader: { height: 76, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E4EBE7' }, back: { fontSize: 36, color: '#426552', paddingRight: 18 }, roomName: { color: '#173C2D', fontWeight: '900', fontSize: 16 }, roomItem: { color: '#27815A', fontSize: 11, marginTop: 3 }, messages: { padding: 18, flexGrow: 1 }, date: { alignSelf: 'center', color: '#8C9A92', fontSize: 11, marginBottom: 18 }, empty: { color: '#829087', textAlign: 'center', marginTop: 28 }, bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, marginBottom: 10 }, mine: { alignSelf: 'flex-end', backgroundColor: '#19734B', borderBottomRightRadius: 5 }, theirs: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#E4EBE7' }, bubbleText: { color: '#465C50', lineHeight: 20 }, mineText: { color: '#FFF' }, composer: { position: 'absolute', left: 0, right: 0, bottom: 78, minHeight: 70, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2EAE5', flexDirection: 'row', alignItems: 'center', padding: 10 }, composeInput: { flex: 1, height: 46, backgroundColor: '#F0F4F1', borderRadius: 23, paddingHorizontal: 16, color: '#233E31' }, send: { width: 42, height: 42, borderRadius: 21, marginLeft: 7, backgroundColor: '#19734B', alignItems: 'center', justifyContent: 'center' }, sendDisabled: { opacity: 0.45 }, sendText: { color: '#FFF', fontSize: 22, fontWeight: '900' } });
