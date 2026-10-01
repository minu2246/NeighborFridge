import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NewPostInput, TradeType } from '../types';

export function AddScreen({ onSubmit }: { onSubmit: (input: NewPostInput) => Promise<void> }) {
  const [name, setName] = useState(''); const [title, setTitle] = useState('');
  const [type, setType] = useState<TradeType>('나눔'); const [expiryDate, setExpiryDate] = useState('');
  const [place, setPlace] = useState(''); const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  async function pickPhoto(camera: boolean) {
    setError('');
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError(camera ? '카메라 권한이 필요해요.' : '사진 접근 권한이 필요해요.'); return; }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.45, base64: true };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.base64) setPhoto({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
  }
  async function submit() {
    setError('');
    if (!name.trim() || !title.trim() || !expiryDate || !place.trim()) { setError('모든 필수 항목을 입력해 주세요.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) || Number.isNaN(new Date(`${expiryDate}T00:00:00`).getTime())) { setError('소비기한을 YYYY-MM-DD 형식으로 입력해 주세요.'); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (new Date(`${expiryDate}T00:00:00`) < today) { setError('이미 지난 소비기한은 등록할 수 없어요.'); return; }
    setSubmitting(true);
    try { await onSubmit({ name: name.trim(), title: title.trim(), type, expiryDate, place: place.trim(), photoBase64: photo?.base64, photoMimeType: photo?.mimeType }); setSaved(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '사진 또는 게시물을 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { setSubmitting(false); }
  }
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.title}>냉장고 열기</Text><Text style={styles.subtitle}>이웃에게 나눌 식재료를 알려주세요.</Text>
    <View style={styles.photo}>{photo ? <><Image source={{ uri: photo.uri }} style={styles.preview}/><Pressable style={styles.remove} onPress={() => setPhoto(null)}><Text style={styles.removeText}>사진 삭제</Text></Pressable></> : <><Text style={styles.photoEmoji}>📷</Text><Text style={styles.photoText}>식재료 사진 추가</Text><View style={styles.photoActions}><Pressable onPress={() => void pickPhoto(true)}><Text style={styles.photoButton}>카메라</Text></Pressable><Pressable onPress={() => void pickPhoto(false)}><Text style={styles.photoButton}>갤러리</Text></Pressable></View></>}</View>
    <Label text="식재료 이름" /><TextInput value={name} onChangeText={setName} style={styles.input} placeholder="예: 유정란 6구" placeholderTextColor="#9AA8A0" />
    <Label text="게시물 제목" /><TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="이웃에게 보여줄 한마디" placeholderTextColor="#9AA8A0" />
    <Label text="거래 방식" /><View style={styles.options}>{(['나눔', '교환', '한끼 나눔'] as TradeType[]).map((value) => <Pressable key={value} onPress={() => setType(value)}><Text style={[styles.option, type === value && styles.selected]}>{value}</Text></Pressable>)}</View>
    <Label text="소비기한" /><TextInput value={expiryDate} onChangeText={setExpiryDate} style={styles.input} placeholder="2026-10-03" placeholderTextColor="#9AA8A0" />
    <Label text="거래 장소" /><TextInput value={place} onChangeText={setPlace} style={styles.input} placeholder="안전한 공공장소를 입력하세요" placeholderTextColor="#9AA8A0" />
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {saved && <Text style={styles.saved}>✓ 홈 목록에 등록되었습니다.</Text>}
    <Pressable onPress={() => void submit()} style={[styles.submit, submitting && styles.disabled]} disabled={submitting}>{submitting ? <ActivityIndicator color="#FFF"/> : <Text style={styles.submitText}>이웃 냉장고에 올리기</Text>}</Pressable>
  </ScrollView>;
}
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
const styles = StyleSheet.create({
  page: { padding: 22, paddingBottom: 110 }, title: { fontSize: 28, fontWeight: '900', color: '#173C2D', marginTop: 14 }, subtitle: { color: '#74867D', marginTop: 6, marginBottom: 22 },
  photo: { height: 190, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9FC8AE', backgroundColor: '#F1F9F4', alignItems: 'center', justifyContent: 'center', marginBottom: 22, overflow: 'hidden' }, photoEmoji: { fontSize: 32 }, photoText: { fontWeight: '800', color: '#276B4D', marginTop: 7 }, photoActions: { flexDirection: 'row', marginTop: 12 }, photoButton: { color: '#FFF', backgroundColor: '#19734B', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, marginHorizontal: 5, overflow: 'hidden', fontWeight: '800' }, preview: { width: '100%', height: '100%' }, remove: { position: 'absolute', right: 10, top: 10, backgroundColor: 'rgba(20,35,28,.75)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 }, removeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  label: { color: '#29483A', fontWeight: '800', fontSize: 14, marginTop: 15, marginBottom: 8 }, input: { height: 50, borderRadius: 13, borderWidth: 1, borderColor: '#DCE7E0', paddingHorizontal: 15, backgroundColor: '#FFF', color: '#173C2D' },
  options: { flexDirection: 'row' }, option: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#EDF2EF', color: '#5D6D64', borderRadius: 12, overflow: 'hidden', marginRight: 8, fontWeight: '700' }, selected: { backgroundColor: '#19734B', color: '#FFF' },
  saved: { color: '#19734B', fontWeight: '800', marginTop: 18, textAlign: 'center' }, submit: { height: 54, borderRadius: 16, backgroundColor: '#19734B', alignItems: 'center', justifyContent: 'center', marginTop: 18 }, submitText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  error: { color: '#B54C3C', fontSize: 12, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  disabled: { opacity: 0.55 },
});
