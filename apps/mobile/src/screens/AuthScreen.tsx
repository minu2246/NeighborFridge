import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, nickname: string, password: string) => Promise<void>;
  onDemo: () => void;
}

export function AuthScreen({ onLogin, onRegister, onDemo }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState(''); const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState(''); const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit() {
    setError(''); setLoading(true);
    try {
      if (mode === 'login') await onLogin(email, password);
      else await onRegister(email, nickname, password);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '다시 시도해 주세요.'); }
    finally { setLoading(false); }
  }
  return <View style={styles.page}>
    <View style={styles.logo}><Text style={styles.logoEmoji}>🥬</Text></View>
    <Text style={styles.brand}>이웃냉장고</Text><Text style={styles.tagline}>가까운 이웃과 식재료를 나누고{`\n`}우리 동네의 낭비를 줄여요.</Text>
    <View style={styles.form}>
      <Text style={styles.heading}>{mode === 'login' ? '다시 만나 반가워요!' : '우리 동네 이웃이 되어주세요'}</Text>
      {mode === 'register' && <TextInput value={nickname} onChangeText={setNickname} style={styles.input} placeholder="닉네임" placeholderTextColor="#94A39A" />}
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholder="이메일" placeholderTextColor="#94A39A" />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="비밀번호 (영문·숫자 10자 이상)" placeholderTextColor="#94A39A" />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable onPress={submit} style={styles.primary} disabled={loading}>{loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>{mode === 'login' ? '로그인' : '회원가입'}</Text>}</Pressable>
      <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}><Text style={styles.switch}>{mode === 'login' ? '처음이신가요? 회원가입' : '이미 계정이 있나요? 로그인'}</Text></Pressable>
    </View>
    <Pressable onPress={onDemo} style={styles.demo}><Text style={styles.demoText}>로그인 없이 데모 둘러보기 →</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({ page: { flex: 1, padding: 28, justifyContent: 'center', backgroundColor: '#F8FBF9' }, logo: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#DDF3E4', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, logoEmoji: { fontSize: 38 }, brand: { color: '#173C2D', fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 13 }, tagline: { color: '#6F8278', lineHeight: 21, textAlign: 'center', marginTop: 8 }, form: { marginTop: 32 }, heading: { color: '#28483A', fontSize: 17, fontWeight: '900', marginBottom: 12 }, input: { height: 52, borderWidth: 1, borderColor: '#D8E5DD', borderRadius: 14, paddingHorizontal: 16, backgroundColor: '#FFF', color: '#173C2D', marginBottom: 10 }, error: { color: '#C84A43', fontSize: 12, marginBottom: 8 }, primary: { height: 54, borderRadius: 15, backgroundColor: '#19734B', alignItems: 'center', justifyContent: 'center', marginTop: 5 }, primaryText: { color: '#FFF', fontSize: 16, fontWeight: '900' }, switch: { color: '#377258', textAlign: 'center', padding: 15, fontWeight: '700', fontSize: 13 }, demo: { alignItems: 'center', marginTop: 8 }, demoText: { color: '#788B80', fontSize: 12, fontWeight: '700' } });
