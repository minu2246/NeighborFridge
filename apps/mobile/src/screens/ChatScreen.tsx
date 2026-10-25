import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getAppointment, listChatRooms, listMessages, respondAppointment, saveAppointment, sendMessage, USE_LOCAL_STORE } from '../api/client';
import { DatePickerModal } from '../components/DatePickerModal';
import { NeighborProfileCard } from '../components/NeighborProfileCard';
import { formatMeetAt, formatTime } from '../lib/chat';
import { Appointment, ChatMessage, ChatTarget } from '../types';


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
  const [rooms, setRooms] = useState<ChatTarget[]>([]);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [planDate, setPlanDate] = useState('');
  const [planTime, setPlanTime] = useState('18:00');
  const [planPlace, setPlanPlace] = useState('');
  const [planError, setPlanError] = useState('');
  const [planNotice, setPlanNotice] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => { setSelected(startTarget ?? null); }, [startTarget]);
  useEffect(() => {
    if (!selected) return;
    void listMessages(selected.roomId).then(setMessages).catch(() => setMessages([]));
    // ponytail: 5초 폴링으로 상대 메시지 수신. 즉시성이 필요하면 SSE(/chats/rooms/:id/events) 또는 WebSocket으로 교체.
    const timer = setInterval(() => {
      void listMessages(selected.roomId).then(setMessages).catch(() => undefined);
      void getAppointment(selected.roomId).then(setAppointment).catch(() => undefined); // 상대의 제안·수락 반영
    }, 5000);
    setPlanOpen(false); setPlanNotice('');
    void getAppointment(selected.roomId).then(setAppointment).catch(() => setAppointment(null));
    return () => clearInterval(timer);
  }, [selected?.roomId]);
  useEffect(() => {
    if (selected || USE_LOCAL_STORE) return;
    const load = () => void listChatRooms().then(setRooms).catch(() => undefined);
    load();
    const timer = setInterval(load, 10_000); // 목록 화면에서도 새 메시지·안 읽은 수 갱신
    return () => clearInterval(timer);
  }, [selected]);
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
      const saved = await sendMessage(selected.roomId, message);
      setMessages((current) => [...current, saved]); setDraft('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } finally { setSending(false); }
  }
  function openPlan() {
    setPlanDate(appointment?.meetAt.slice(0, 10) ?? ''); setPlanTime(appointment?.meetAt.slice(11) ?? '18:00'); setPlanPlace(appointment?.place ?? ''); setPlanError(''); setPlanOpen(true);
  }
  async function respond(accept: boolean) {
    if (!selected) return;
    setPlanNotice('');
    try {
      const result = await respondAppointment(selected.roomId, accept);
      setAppointment(result.appointment); setMessages((current) => [...current, result.message]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (error) { setPlanNotice(error instanceof Error ? error.message : '처리하지 못했어요.'); }
  }
  async function savePlan() {
    if (!selected) return;
    if (!planDate) return setPlanError('날짜를 선택하세요.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(planTime)) return setPlanError('시간은 18:30 형식으로 입력하세요.');
    if (planPlace.trim().length < 2) return setPlanError('만날 장소를 입력하세요.');
    try {
      const saved = await saveAppointment(selected.roomId, `${planDate}T${planTime}`, planPlace);
      setAppointment(saved.appointment); setMessages((current) => [...current, saved.message]); setPlanOpen(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (error) { setPlanError(error instanceof Error ? error.message : '약속을 저장하지 못했습니다.'); }
  }
  if (selected) return <KeyboardAvoidingView style={styles.room} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.roomHeader}><Pressable onPress={() => { setSelected(null); setShowProfile(false); }}><Text style={styles.back}>‹</Text></Pressable><Pressable disabled={!selected.neighborId} onPress={() => setShowProfile((v) => !v)}><Text style={styles.roomName}>{selected.neighborName}{selected.neighborId ? `  ${showProfile ? '▴' : '▾'}` : ''}</Text><Text style={styles.roomItem}>{selected.item}</Text></Pressable></View>
    {showProfile && selected.neighborId ? <View style={styles.profileWrap}><NeighborProfileCard userId={selected.neighborId} /></View> : null}
    <View style={styles.plan}><Pressable style={styles.planMain} onPress={openPlan}><Text style={styles.planText}>{appointment ? `📅 ${formatMeetAt(appointment.meetAt)} · ${appointment.place}` : '📅 아직 거래 약속이 없어요'}</Text>{appointment?.status ? <Text style={styles.planStatus}>{appointment.status === 'ACCEPTED' ? '✅ 약속 확정' : appointment.proposedByMe ? '상대가 수락하면 확정돼요' : '이웃이 약속을 제안했어요'}</Text> : null}</Pressable>
      {appointment?.status === 'PROPOSED' && !appointment.proposedByMe
        ? <><Pressable onPress={() => void respond(false)}><Text style={styles.planDecline}>거절</Text></Pressable><Pressable onPress={() => void respond(true)}><Text style={styles.planAction}>수락</Text></Pressable></>
        : <Pressable onPress={openPlan}><Text style={styles.planAction}>{appointment ? '변경' : '약속 잡기'}</Text></Pressable>}</View>
    {planNotice ? <Text style={styles.planNotice}>{planNotice}</Text> : null}
    {planOpen && <View style={styles.planForm}>
      <Pressable style={styles.planInput} onPress={() => setCalendarOpen(true)}><Text style={planDate ? styles.planValue : styles.planPlaceholder}>{planDate || '날짜 선택'}</Text></Pressable>
      <TextInput value={planTime} onChangeText={setPlanTime} style={styles.planInput} placeholder="18:30" placeholderTextColor="#99A69F" maxLength={5} />
      <TextInput value={planPlace} onChangeText={setPlanPlace} style={styles.planInput} placeholder="만날 장소 (예: 시청역 4번 출구)" placeholderTextColor="#99A69F" maxLength={80} />
      {!!planError && <Text style={styles.planError}>{planError}</Text>}
      <View style={styles.planButtons}><Pressable onPress={() => setPlanOpen(false)}><Text style={styles.planCancel}>취소</Text></Pressable><Pressable style={styles.planSave} onPress={() => void savePlan()}><Text style={styles.planSaveText}>약속 저장</Text></Pressable></View>
    </View>}
    <DatePickerModal visible={calendarOpen} value={planDate} onClose={() => setCalendarOpen(false)} onSelect={(date) => { setPlanDate(date); setCalendarOpen(false); }} />
    <ScrollView ref={scrollRef} contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled"><Text style={styles.date}>오늘</Text>{messages.length === 0 ? <Text style={styles.empty}>첫 메시지를 보내 약속을 잡아보세요.</Text> : messages.map((entry) => <View key={entry.id} style={[styles.bubble, entry.sender === 'me' ? styles.mine : styles.theirs]}><Text style={[styles.bubbleText, entry.sender === 'me' && styles.mineText]}>{entry.message}</Text></View>)}</ScrollView>
    <View style={styles.composer}><TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => void send()} returnKeyType="send" style={styles.composeInput} placeholder="따뜻한 메시지를 입력하세요" placeholderTextColor="#99A69F" /><Pressable style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]} onPress={() => void send()} disabled={!draft.trim() || sending}>{sending ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.sendText}>↑</Text>}</Pressable></View>
  </KeyboardAvoidingView>;
  return <ScrollView contentContainerStyle={styles.page}><Text style={styles.title}>이웃 대화</Text><Text style={styles.subtitle}>따뜻하고 안전하게 약속을 정해요.</Text>
    {!USE_LOCAL_STORE ? (rooms.length === 0 ? <Text style={styles.empty}>아직 대화가 없어요. 게시물에서 채팅을 시작해 보세요.</Text> : rooms.map((room) => <Pressable style={styles.row} key={room.roomId} onPress={() => setSelected(room)}><View style={styles.avatar}><Text style={styles.emoji}>{room.emoji}</Text></View><View style={styles.copy}><View style={styles.top}><Text style={styles.name}>{room.neighborName}</Text>{room.lastMessageAt ? <Text style={styles.time}>{formatTime(room.lastMessageAt)}</Text> : null}</View><Text style={styles.item}>{room.item}</Text><Text style={styles.message} numberOfLines={1}>{room.lastMessage ?? '아직 메시지가 없어요'}</Text>{room.appointmentNotice ? <Text style={styles.notice}>{room.appointmentNotice}</Text> : null}</View>{room.unread ? <Text style={styles.unread}>{room.unread}</Text> : null}</Pressable>)) : chats.map((chat) => <Pressable style={styles.row} key={chat.name} onPress={() => setSelected({ roomId: `demo-${chat.id}`, item: chat.item, emoji: chat.emoji, neighborName: chat.name })}><View style={styles.avatar}><Text style={styles.emoji}>{chat.emoji}</Text></View><View style={styles.copy}><View style={styles.top}><Text style={styles.name}>{chat.name}</Text><Text style={styles.time}>{chat.time}</Text></View><Text style={styles.item}>{chat.item}</Text><Text style={styles.message} numberOfLines={1}>{chat.message}</Text></View>{chat.unread > 0 && <Text style={styles.unread}>{chat.unread}</Text>}</Pressable>)}
    <View style={styles.safety}><Text style={styles.safetyTitle}>🛡️ 안전한 거래 약속</Text><Text style={styles.safetyText}>사람이 많은 공공장소에서 만나고, 집 주소는 공유하지 마세요.</Text></View>
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 22, paddingBottom: 110 }, title: { marginTop: 14, fontSize: 28, fontWeight: '900', color: '#173C2D' }, subtitle: { color: '#74867D', marginTop: 6, marginBottom: 20 }, row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EDF2EF', paddingVertical: 17 }, avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#EAF5ED', alignItems: 'center', justifyContent: 'center' }, emoji: { fontSize: 27 }, copy: { flex: 1, marginLeft: 13 }, top: { flexDirection: 'row', justifyContent: 'space-between' }, name: { fontSize: 16, fontWeight: '800', color: '#213D31' }, time: { fontSize: 11, color: '#93A198' }, item: { fontSize: 11, color: '#2A8058', fontWeight: '700', marginTop: 3 }, message: { color: '#64756C', marginTop: 4, fontSize: 13 }, unread: { backgroundColor: '#E95F4F', color: '#FFF', fontWeight: '800', borderRadius: 12, overflow: 'hidden', minWidth: 23, textAlign: 'center', paddingVertical: 3 }, safety: { marginTop: 26, padding: 18, borderRadius: 16, backgroundColor: '#FFF8DF' }, safetyTitle: { fontWeight: '900', color: '#6E5B18' }, safetyText: { color: '#887634', fontSize: 12, lineHeight: 19, marginTop: 7 }, room: { flex: 1, backgroundColor: '#F7FAF8', paddingBottom: 148 }, profileWrap: { paddingHorizontal: 16, paddingTop: 12 }, roomHeader: { height: 76, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E4EBE7' }, back: { fontSize: 36, color: '#426552', paddingRight: 18 }, roomName: { color: '#173C2D', fontWeight: '900', fontSize: 16 }, roomItem: { color: '#27815A', fontSize: 11, marginTop: 3 }, messages: { padding: 18, flexGrow: 1 }, date: { alignSelf: 'center', color: '#8C9A92', fontSize: 11, marginBottom: 18 }, empty: { color: '#829087', textAlign: 'center', marginTop: 28 }, bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 17, marginBottom: 10 }, mine: { alignSelf: 'flex-end', backgroundColor: '#19734B', borderBottomRightRadius: 5 }, theirs: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#E4EBE7' }, bubbleText: { color: '#465C50', lineHeight: 20 }, mineText: { color: '#FFF' }, composer: { position: 'absolute', left: 0, right: 0, bottom: 78, minHeight: 70, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2EAE5', flexDirection: 'row', alignItems: 'center', padding: 10 }, composeInput: { flex: 1, height: 46, backgroundColor: '#F0F4F1', borderRadius: 23, paddingHorizontal: 16, color: '#233E31' }, send: { width: 42, height: 42, borderRadius: 21, marginLeft: 7, backgroundColor: '#19734B', alignItems: 'center', justifyContent: 'center' }, sendDisabled: { opacity: 0.45 }, sendText: { color: '#FFF', fontSize: 22, fontWeight: '900' }, plan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, backgroundColor: '#FFF8DF' }, planText: { color: '#6E5B18', fontWeight: '700', fontSize: 13 }, planMain: { flex: 1 }, planStatus: { color: '#8A6D2C', fontSize: 11, marginTop: 3 }, planDecline: { color: '#B54C3C', fontWeight: '800', marginLeft: 10 }, planNotice: { color: '#B54C3C', fontSize: 12, paddingHorizontal: 18, paddingVertical: 6, backgroundColor: '#FFF8DF' }, notice: { alignSelf: 'flex-start', color: '#D4553B', backgroundColor: '#FFF1EE', fontSize: 11, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, overflow: 'hidden', marginTop: 4 }, planAction: { color: '#19734B', fontWeight: '900', marginLeft: 10 }, planForm: { padding: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E4EBE7' }, planInput: { height: 44, justifyContent: 'center', backgroundColor: '#F0F4F1', borderRadius: 12, paddingHorizontal: 14, marginBottom: 8, color: '#233E31' }, planValue: { color: '#233E31' }, planPlaceholder: { color: '#99A69F' }, planError: { color: '#E95F4F', fontSize: 12, marginBottom: 8 }, planButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }, planCancel: { color: '#74867D', fontWeight: '700', marginRight: 18 }, planSave: { backgroundColor: '#19734B', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }, planSaveText: { color: '#FFF', fontWeight: '900' } });
