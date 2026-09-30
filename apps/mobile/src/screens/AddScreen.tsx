import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NewPostInput, TradeType } from '../types';

export function AddScreen({ onSubmit }: { onSubmit: (input: NewPostInput) => void }) {
  const [name, setName] = useState(''); const [title, setTitle] = useState('');
  const [type, setType] = useState<TradeType>('나눔'); const [expiryDate, setExpiryDate] = useState('');
  const [place, setPlace] = useState(''); const [saved, setSaved] = useState(false);
  function submit() { if (!name || !title || !expiryDate || !place) return; onSubmit({ name, title, type, expiryDate, place }); setSaved(true); }
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.title}>냉장고 열기</Text><Text style={styles.subtitle}>이웃에게 나눌 식재료를 알려주세요.</Text>
    <Pressable style={styles.photo}><Text style={styles.photoEmoji}>📷</Text><Text style={styles.photoText}>사진 추가</Text><Text style={styles.photoHint}>최대 5장</Text></Pressable>
    <Label text="식재료 이름" /><TextInput value={name} onChangeText={setName} style={styles.input} placeholder="예: 유정란 6구" placeholderTextColor="#9AA8A0" />
    <Label text="게시물 제목" /><TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="이웃에게 보여줄 한마디" placeholderTextColor="#9AA8A0" />
    <Label text="거래 방식" /><View style={styles.options}>{(['나눔', '교환', '한끼 나눔'] as TradeType[]).map((value) => <Pressable key={value} onPress={() => setType(value)}><Text style={[styles.option, type === value && styles.selected]}>{value}</Text></Pressable>)}</View>
    <Label text="소비기한" /><TextInput value={expiryDate} onChangeText={setExpiryDate} style={styles.input} placeholder="2026-10-03" placeholderTextColor="#9AA8A0" />
    <Label text="거래 장소" /><TextInput value={place} onChangeText={setPlace} style={styles.input} placeholder="안전한 공공장소를 입력하세요" placeholderTextColor="#9AA8A0" />
    {saved && <Text style={styles.saved}>✓ 홈 목록에 등록되었습니다.</Text>}
    <Pressable onPress={submit} style={styles.submit}><Text style={styles.submitText}>이웃 냉장고에 올리기</Text></Pressable>
  </ScrollView>;
}
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
const styles = StyleSheet.create({
  page: { padding: 22, paddingBottom: 110 }, title: { fontSize: 28, fontWeight: '900', color: '#173C2D', marginTop: 14 }, subtitle: { color: '#74867D', marginTop: 6, marginBottom: 22 },
  photo: { height: 150, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9FC8AE', backgroundColor: '#F1F9F4', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }, photoEmoji: { fontSize: 32 }, photoText: { fontWeight: '800', color: '#276B4D', marginTop: 7 }, photoHint: { color: '#8A9B92', fontSize: 11, marginTop: 3 },
  label: { color: '#29483A', fontWeight: '800', fontSize: 14, marginTop: 15, marginBottom: 8 }, input: { height: 50, borderRadius: 13, borderWidth: 1, borderColor: '#DCE7E0', paddingHorizontal: 15, backgroundColor: '#FFF', color: '#173C2D' },
  options: { flexDirection: 'row' }, option: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#EDF2EF', color: '#5D6D64', borderRadius: 12, overflow: 'hidden', marginRight: 8, fontWeight: '700' }, selected: { backgroundColor: '#19734B', color: '#FFF' },
  saved: { color: '#19734B', fontWeight: '800', marginTop: 18, textAlign: 'center' }, submit: { height: 54, borderRadius: 16, backgroundColor: '#19734B', alignItems: 'center', justifyContent: 'center', marginTop: 18 }, submitText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});
