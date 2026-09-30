import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Neighborhood } from '../types';

export function LocationScreen({ onComplete }: { onComplete: (value: Neighborhood) => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  async function locate() {
    setLoading(true); setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) { setManual(true); setError('위치 권한 없이도 동네를 직접 입력할 수 있어요.'); return; }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      const area = [address?.city, address?.district, address?.subregion].filter((v, i, values) => v && values.indexOf(v) === i).slice(0, 2).join(' ') || '현재 위치';
      await onComplete({ name: area, latitude, longitude, radiusKm: 3 });
    } catch { setManual(true); setError('현재 위치를 확인하지 못했어요. 동네를 직접 입력해 주세요.'); }
    finally { setLoading(false); }
  }
  async function submitManual() {
    if (name.trim().length < 2) { setError('동네 이름을 두 글자 이상 입력해 주세요.'); return; }
    setLoading(true);
    try { await onComplete({ name: name.trim(), latitude: 37.5665, longitude: 126.978, radiusKm: 3 }); }
    finally { setLoading(false); }
  }
  return <View style={styles.page}><Text style={styles.emoji}>📍</Text><Text style={styles.title}>우리 동네를 인증해요</Text><Text style={styles.copy}>가까운 이웃의 냉장고만 보여드리기 위해{`\n`}현재 위치를 한 번 확인할게요.</Text>
    {!manual ? <Pressable style={styles.primary} onPress={locate} disabled={loading}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>현재 위치로 인증하기</Text>}</Pressable> : <><TextInput value={name} onChangeText={setName} placeholder="예: 서울 중구, 성수동" style={styles.input}/><Pressable style={styles.primary} onPress={submitManual} disabled={loading}><Text style={styles.primaryText}>이 동네로 시작하기</Text></Pressable></>}
    {error ? <Text style={styles.error}>{error}</Text> : null}<Pressable onPress={() => setManual((value) => !value)}><Text style={styles.link}>{manual ? 'GPS로 다시 인증하기' : '동네 직접 입력하기'}</Text></Pressable><Text style={styles.note}>위치 정보는 이 프로젝트의 로컬 저장소에만 보관됩니다.</Text>
  </View>;
}
const styles = StyleSheet.create({ page: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#F8FBF9' }, emoji: { fontSize: 55, textAlign: 'center' }, title: { fontSize: 27, fontWeight: '900', color: '#173C2D', textAlign: 'center', marginTop: 18 }, copy: { color: '#65766D', lineHeight: 23, textAlign: 'center', marginTop: 12, marginBottom: 30 }, primary: { minHeight: 54, borderRadius: 16, backgroundColor: '#19734B', alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#FFF', fontWeight: '900', fontSize: 16 }, input: { height: 54, borderWidth: 1, borderColor: '#C9D9D0', backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 16, marginBottom: 12 }, error: { color: '#A14C3C', textAlign: 'center', marginTop: 12, fontSize: 12 }, link: { color: '#19734B', fontWeight: '800', textAlign: 'center', marginTop: 20 }, note: { color: '#92A098', textAlign: 'center', fontSize: 10, marginTop: 30 } });
