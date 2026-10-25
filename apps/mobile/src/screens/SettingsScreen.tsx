import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { changePassword, getMe, isLoggedIn, updateMe, USE_LOCAL_STORE } from '../api/client';
import { MyAccount } from '../types';

// 프로필의 "알림 설정"·"계정 및 개인정보" 화면 (정식 모드 + 로그인 전용)
export function SettingsScreen({ mode, onBack, onNicknameChange }: { mode: 'notify' | 'account'; onBack: () => void; onNicknameChange: (nickname: string) => void }) {
  const [me, setMe] = useState<MyAccount | null>(null);
  const [loadError, setLoadError] = useState('');
  const [nickname, setNickname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const available = !USE_LOCAL_STORE && isLoggedIn();
  useEffect(() => {
    if (!available) return;
    void getMe().then((value) => { setMe(value); setNickname(value.nickname); }).catch(() => setLoadError('정보를 불러오지 못했어요.'));
  }, [available]);
  async function run(action: () => Promise<string>) {
    setSaving(true); setMessage(null);
    try { setMessage({ text: await action(), ok: true }); }
    catch (reason) { setMessage({ text: reason instanceof Error ? reason.message : '저장하지 못했어요.', ok: false }); }
    finally { setSaving(false); }
  }
  const toggleReviews = (value: boolean) => run(async () => { setMe(await updateMe({ notifyReviews: value })); return value ? '거래 후기 알림을 켰어요.' : '거래 후기 알림을 껐어요.'; });
  const saveNickname = () => run(async () => { const saved = await updateMe({ nickname }); setMe(saved); setNickname(saved.nickname); onNicknameChange(saved.nickname); return '닉네임을 바꿨어요.'; });
  const savePassword = () => run(async () => { await changePassword(currentPassword, newPassword); setCurrentPassword(''); setNewPassword(''); return '비밀번호를 바꿨어요.'; });

  return <ScrollView contentContainerStyle={styles.page}>
    <Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>‹  나의 냉장고</Text></Pressable>
    <Text style={styles.title}>{mode === 'notify' ? '알림 설정' : '계정 및 개인정보'}</Text>
    {!available ? <Text style={styles.muted}>로그인하면 설정할 수 있어요.</Text>
      : loadError ? <Text style={styles.bad}>{loadError}</Text>
      : !me ? <ActivityIndicator color="#19734B" style={styles.loading} />
      : mode === 'notify' ? <View style={styles.card}>
          <View style={styles.row}><View style={styles.rowCopy}><Text style={styles.label}>거래 후기 알림</Text><Text style={styles.muted}>남길 후기·새로 받은 후기를 탭 배지로 알려 드려요</Text></View><Switch value={me.notifyReviews} disabled={saving} onValueChange={(value) => void toggleReviews(value)} trackColor={{ true: '#19734B', false: '#D3E1D8' }} /></View>
          <Text style={[styles.muted, styles.note]}>휴대폰 푸시 알림은 준비 중이에요.</Text>
        </View>
      : <>
          <View style={styles.card}><Text style={styles.label}>이메일</Text><Text style={styles.value}>{me.email}</Text></View>
          <View style={styles.card}><Text style={styles.label}>닉네임</Text><TextInput value={nickname} onChangeText={setNickname} maxLength={50} style={styles.input} />
            <Pressable disabled={saving || nickname.trim() === me.nickname || nickname.trim().length < 2} style={[styles.button, (saving || nickname.trim() === me.nickname || nickname.trim().length < 2) && styles.disabled]} onPress={() => void saveNickname()}><Text style={styles.buttonText}>닉네임 저장</Text></Pressable></View>
          <View style={styles.card}><Text style={styles.label}>비밀번호 변경</Text>
            <TextInput value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="현재 비밀번호" placeholderTextColor="#99A69F" style={styles.input} />
            <TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="새 비밀번호 (영문·숫자 10자 이상)" placeholderTextColor="#99A69F" style={styles.input} />
            <Pressable disabled={saving || !currentPassword || newPassword.length < 10} style={[styles.button, (saving || !currentPassword || newPassword.length < 10) && styles.disabled]} onPress={() => void savePassword()}><Text style={styles.buttonText}>비밀번호 변경</Text></Pressable></View>
        </>}
    {message ? <Text style={message.ok ? styles.good : styles.bad}>{message.text}</Text> : null}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 22, paddingBottom: 110 }, back: { alignSelf: 'flex-start', paddingVertical: 9 }, backText: { color: '#426552', fontWeight: '800' }, title: { marginTop: 8, marginBottom: 14, fontSize: 24, fontWeight: '900', color: '#173C2D' }, loading: { marginTop: 30 }, card: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 12 }, row: { flexDirection: 'row', alignItems: 'center' }, rowCopy: { flex: 1, marginRight: 10 }, label: { color: '#385044', fontWeight: '800', marginBottom: 4 }, value: { color: '#173C2D', fontSize: 15 }, muted: { color: '#85958C', fontSize: 12 }, note: { marginTop: 12 }, input: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#D3E1D8', paddingHorizontal: 12, marginTop: 8, color: '#173C2D', backgroundColor: '#F7FAF8' }, button: { height: 42, borderRadius: 12, backgroundColor: '#19734B', alignItems: 'center', justifyContent: 'center', marginTop: 10 }, disabled: { opacity: 0.4 }, buttonText: { color: '#FFF', fontWeight: '900' }, good: { color: '#19734B', fontWeight: '700', textAlign: 'center', marginTop: 6 }, bad: { color: '#B54C3C', fontWeight: '700', textAlign: 'center', marginTop: 6 } });
