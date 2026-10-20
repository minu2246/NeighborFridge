import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { isLoggedIn, readLabel, USE_LOCAL_STORE } from '../api/client';
import { DatePickerModal } from '../components/DatePickerModal';
import { NewPostInput, TradeType } from '../types';

export function AddScreen({ onSubmit }: { onSubmit: (input: NewPostInput) => Promise<void> }) {
  const [name, setName] = useState(''); const [title, setTitle] = useState('');
  const [type, setType] = useState<TradeType>('나눔'); const [expiryDate, setExpiryDate] = useState('');
  const [place, setPlace] = useState(''); const [saved, setSaved] = useState(false);
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(''); // g, 선택 (탄소 절감 추정용)
  const weightGrams = /^\d+$/.test(weight.trim()) ? Number(weight.trim()) : undefined;
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [autoNotes, setAutoNotes] = useState<string[]>([]);
  const [autoError, setAutoError] = useState(''); // 버튼 바로 아래에 표시(폼 맨 아래 오류는 눈에 안 띔)
  // 포장지 사진 OCR → 비어 있는 칸만 채움(직접 입력한 값은 덮어쓰지 않음). 결과는 사용자가 확인.
  async function autoFill() {
    if (!photo) return;
    setReading(true); setAutoError(''); setAutoNotes([]);
    try {
      const info = await readLabel(photo.base64, photo.mimeType);
      const notes: string[] = [];
      if (info.itemName) { if (!name.trim()) setName(info.itemName); notes.push(`상품명: ${info.itemName}`); } else notes.push('상품명: 찾지 못함 (직접 입력)');
      if (info.expiryDate) { if (!expiryDate) setExpiryDate(info.expiryDate); notes.push(`소비기한: ${formatDate(info.expiryDate)}`); } else notes.push('소비기한: 찾지 못함 (달력에서 선택)');
      const extra: string[] = [];
      if (info.weightText) { extra.push(`내용량: ${info.weightText}`); notes.push(`내용량: ${info.weightText}`); }
      if (info.weightGrams && !weight.trim()) setWeight(String(Math.round(info.weightGrams)));
      if (info.allergenLabelFound) {
        const text = info.allergens.length ? info.allergens.join(', ') : '표시 문구는 있으나 성분을 읽지 못함';
        extra.push(`알레르기 유발물질: ${text}`); notes.push(`알레르기: ${text}`);
      } else {
        if (info.allergens.length) extra.push(`원재료에서 찾은 알레르기 성분: ${info.allergens.join(', ')} (포장지 표시 확인 필요)`);
        notes.push(`알레르기: 표시 확인 불가${info.allergens.length ? ` · 원재료에서 ${info.allergens.join(', ')} 발견` : ''}`);
      }
      if (extra.length) setDescription((current) => [current.trim(), ...extra.filter((line) => !current.includes(line))].filter(Boolean).join('\n'));
      setAutoNotes(notes); setSaved(false);
    } catch (reason) { setAutoError(reason instanceof Error ? `${reason.message} 직접 입력해 주세요.` : '사진을 읽지 못했어요. 직접 입력해 주세요.'); }
    finally { setReading(false); }
  }
  async function pickPhoto(camera: boolean) {
    setError('');
    const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError(camera ? '카메라 권한이 필요해요.' : '사진 접근 권한이 필요해요.'); return; }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.45, base64: true };
    const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.base64) { setAutoNotes([]); setAutoError(''); }
    if (!result.canceled && asset?.base64) setPhoto({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
  }
  async function savePost() {
    setSubmitting(true);
    try { await onSubmit({ name: name.trim(), title: title.trim(), type, expiryDate, place: place.trim(), description: description.trim() || undefined, weightGrams, photoBase64: photo?.base64, photoMimeType: photo?.mimeType }); setSaved(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '사진 또는 게시물을 저장하지 못했어요. 다시 시도해 주세요.'); }
    finally { setSubmitting(false); }
  }
  function submit() {
    setError('');
    if (!name.trim() || !title.trim() || !expiryDate || !place.trim()) { setError('모든 필수 항목을 입력해 주세요.'); return; }
    if (weight.trim() && (!weightGrams || weightGrams > 100000)) { setError('무게는 1~100000 사이의 숫자(g)로 입력해 주세요.'); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = new Date(`${expiryDate}T00:00:00`);
    const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
    if (days <= 2) { setWarningOpen(true); return; }
    void savePost();
  }
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.title}>냉장고 열기</Text><Text style={styles.subtitle}>이웃에게 나눌 식재료를 알려주세요.</Text>
    <View style={styles.photo}>{photo ? <><Image source={{ uri: photo.uri }} style={styles.preview}/><Pressable style={styles.remove} onPress={() => setPhoto(null)}><Text style={styles.removeText}>사진 삭제</Text></Pressable></> : <><Text style={styles.photoEmoji}>📷</Text><Text style={styles.photoText}>식재료 사진 추가</Text><View style={styles.photoActions}><Pressable onPress={() => void pickPhoto(true)}><Text style={styles.photoButton}>카메라</Text></Pressable><Pressable onPress={() => void pickPhoto(false)}><Text style={styles.photoButton}>갤러리</Text></Pressable></View></>}</View>
    {photo && !USE_LOCAL_STORE && !isLoggedIn() ? <Text style={styles.autoHint}>📷 포장지 사진 자동 작성은 로그인하면 사용할 수 있어요</Text> : null}
    {autoError ? <Text style={styles.autoErrorText}>{autoError}</Text> : null}
    {photo && !USE_LOCAL_STORE && isLoggedIn() ? <Pressable style={[styles.autoButton, reading && styles.disabled]} disabled={reading} onPress={() => void autoFill()}>{reading ? <View style={styles.autoReading}><ActivityIndicator color="#19734B" /><Text style={styles.autoButtonText}>  사진 읽는 중… (5~10초)</Text></View> : <Text style={styles.autoButtonText}>📷 포장지 사진으로 자동 작성</Text>}</Pressable> : null}
    {autoNotes.length ? <View style={styles.autoBox}><Text style={styles.autoTitle}>자동 입력됨 — 포장지와 꼭 비교해 확인해 주세요</Text>{autoNotes.map((note) => <Text key={note} style={styles.autoNote}>• {note}</Text>)}</View> : null}
    <Label text="식재료 이름" /><TextInput value={name} onChangeText={setName} style={styles.input} placeholder="예: 유정란 6구" placeholderTextColor="#9AA8A0" />
    <Label text="게시물 제목" /><TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="이웃에게 보여줄 한마디" placeholderTextColor="#9AA8A0" />
    <Label text="설명 (선택)" /><TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.multiline]} placeholder="보관 상태, 남은 양 등을 알려주세요" placeholderTextColor="#9AA8A0" multiline maxLength={2000} />
    <Label text="거래 방식" /><View style={styles.options}>{(['나눔', '교환', '한끼 나눔'] as TradeType[]).map((value) => <Pressable key={value} onPress={() => setType(value)}><Text style={[styles.option, type === value && styles.selected]}>{value}</Text></Pressable>)}</View>
    <Label text="소비기한" /><Pressable onPress={() => setCalendarOpen(true)} style={styles.dateButton}><Text style={expiryDate ? styles.dateValue : styles.datePlaceholder}>{expiryDate ? formatDate(expiryDate) : '날짜 선택하기'}</Text><Text style={styles.calendarIcon}>▣</Text></Pressable>
    {!USE_LOCAL_STORE ? <><Label text="무게 (선택, g)" /><TextInput value={weight} onChangeText={setWeight} style={styles.input} placeholder="예: 300 — 나눔으로 줄인 탄소를 계산해요" placeholderTextColor="#9AA8A0" keyboardType="number-pad" maxLength={6} /></> : null}
    <Label text="거래 장소" /><TextInput value={place} onChangeText={setPlace} style={styles.input} placeholder="안전한 공공장소를 입력하세요" placeholderTextColor="#9AA8A0" />
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {saved && <Text style={styles.saved}>✓ 홈 목록에 등록되었습니다.</Text>}
    <Pressable onPress={submit} style={[styles.submit, submitting && styles.disabled]} disabled={submitting}>{submitting ? <ActivityIndicator color="#FFF"/> : <Text style={styles.submitText}>이웃 냉장고에 올리기</Text>}</Pressable>
    <DatePickerModal visible={calendarOpen} value={expiryDate} onClose={() => setCalendarOpen(false)} onSelect={(date) => { setExpiryDate(date); setCalendarOpen(false); setSaved(false); }} />
    <Modal visible={warningOpen} transparent animationType="fade" onRequestClose={() => setWarningOpen(false)}><View style={styles.warningOverlay}><View style={styles.warningBox}><Text style={styles.warningEmoji}>⚠️</Text><Text style={styles.warningTitle}>소비기한이 얼마 남지 않았어요</Text><Text style={styles.warningText}>{expiryDate === todayKey() ? '소비기한이 오늘까지인 식품입니다.' : `소비기한이 ${daysUntil(expiryDate)}일 남은 식품입니다.`}{'\n'}식품 상태와 보관 상태를 다시 확인해 주세요.</Text><Pressable style={styles.warningConfirm} onPress={() => { setWarningOpen(false); void savePost(); }}><Text style={styles.warningConfirmText}>상태 확인 후 등록</Text></Pressable><Pressable style={styles.warningCancel} onPress={() => { setWarningOpen(false); setCalendarOpen(true); }}><Text style={styles.warningCancelText}>날짜 다시 선택</Text></Pressable></View></View></Modal>
  </ScrollView>;
}
function Label({ text }: { text: string }) { return <Text style={styles.label}>{text}</Text>; }
function formatDate(value: string) { const [year, month, day] = value.split('-'); return `${year}년 ${Number(month)}월 ${Number(day)}일`; }
function todayKey() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function daysUntil(value: string) { const today = new Date(); today.setHours(0, 0, 0, 0); return Math.round((new Date(`${value}T00:00:00`).getTime() - today.getTime()) / 86_400_000); }
const styles = StyleSheet.create({
  page: { padding: 22, paddingBottom: 110 }, title: { fontSize: 28, fontWeight: '900', color: '#173C2D', marginTop: 14 }, subtitle: { color: '#74867D', marginTop: 6, marginBottom: 22 },
  photo: { height: 190, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9FC8AE', backgroundColor: '#F1F9F4', alignItems: 'center', justifyContent: 'center', marginBottom: 22, overflow: 'hidden' }, photoEmoji: { fontSize: 32 }, photoText: { fontWeight: '800', color: '#276B4D', marginTop: 7 }, photoActions: { flexDirection: 'row', marginTop: 12 }, photoButton: { color: '#FFF', backgroundColor: '#19734B', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, marginHorizontal: 5, overflow: 'hidden', fontWeight: '800' }, preview: { width: '100%', height: '100%' }, remove: { position: 'absolute', right: 10, top: 10, backgroundColor: 'rgba(20,35,28,.75)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 }, removeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  label: { color: '#29483A', fontWeight: '800', fontSize: 14, marginTop: 15, marginBottom: 8 }, input: { height: 50, borderRadius: 13, borderWidth: 1, borderColor: '#DCE7E0', paddingHorizontal: 15, backgroundColor: '#FFF', color: '#173C2D' },
  dateButton: { height: 50, borderRadius: 13, borderWidth: 1, borderColor: '#DCE7E0', paddingHorizontal: 15, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center' }, dateValue: { flex: 1, color: '#173C2D', fontWeight: '800' }, datePlaceholder: { flex: 1, color: '#9AA8A0' }, calendarIcon: { color: '#19734B', fontSize: 17 },
  options: { flexDirection: 'row' }, option: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#EDF2EF', color: '#5D6D64', borderRadius: 12, overflow: 'hidden', marginRight: 8, fontWeight: '700' }, selected: { backgroundColor: '#19734B', color: '#FFF' },
  saved: { color: '#19734B', fontWeight: '800', marginTop: 18, textAlign: 'center' }, submit: { height: 54, borderRadius: 16, backgroundColor: '#19734B', alignItems: 'center', justifyContent: 'center', marginTop: 18 }, submitText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  error: { color: '#B54C3C', fontSize: 12, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  autoButton: { height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: '#19734B', backgroundColor: '#F1F9F4', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }, autoButtonText: { color: '#19734B', fontWeight: '900' }, autoReading: { flexDirection: 'row', alignItems: 'center' }, autoHint: { color: '#74867D', fontSize: 12, textAlign: 'center', marginBottom: 6 }, autoErrorText: { color: '#B54C3C', fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  autoBox: { backgroundColor: '#FFF8DF', borderRadius: 14, padding: 14, marginTop: 8 }, autoTitle: { color: '#6E5B18', fontWeight: '900', marginBottom: 6 }, autoNote: { color: '#6E5B18', fontSize: 12, lineHeight: 19 },
  disabled: { opacity: 0.55 }, multiline: { height: 96, paddingTop: 13, textAlignVertical: 'top' },
  warningOverlay: { flex: 1, backgroundColor: 'rgba(17,39,29,.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }, warningBox: { width: '100%', maxWidth: 360, backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center' }, warningEmoji: { fontSize: 36 }, warningTitle: { color: '#5C4018', fontSize: 19, fontWeight: '900', marginTop: 10 }, warningText: { color: '#735F3D', lineHeight: 22, textAlign: 'center', marginTop: 10, marginBottom: 20 }, warningConfirm: { width: '100%', height: 50, borderRadius: 14, backgroundColor: '#D4772B', alignItems: 'center', justifyContent: 'center' }, warningConfirmText: { color: '#FFF', fontWeight: '900' }, warningCancel: { paddingVertical: 14 }, warningCancelText: { color: '#66766E', fontWeight: '800' },
});
