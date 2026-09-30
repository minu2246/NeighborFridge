import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { getHealth, login, register } from './api/client';
import { demoPosts } from './data/demo';
import { AddScreen } from './screens/AddScreen';
import { ChatScreen } from './screens/ChatScreen';
import { HomeScreen } from './screens/HomeScreen';
import { AuthScreen } from './screens/AuthScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PostDetailScreen } from './screens/PostDetailScreen';
import { FoodPost, NewPostInput, TabName } from './types';

const tabs: { key: TabName; icon: string; label: string }[] = [
  { key: 'home', icon: '⌂', label: '동네' }, { key: 'add', icon: '+', label: '등록' },
  { key: 'chat', icon: '○', label: '채팅' }, { key: 'profile', icon: '♙', label: '나의 냉장고' },
];

export default function App() {
  const [tab, setTab] = useState<TabName>('home');
  const [online, setOnline] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [posts, setPosts] = useState<FoodPost[]>(demoPosts);
  const [selectedPost, setSelectedPost] = useState<FoodPost | null>(null);
  const [chatItem, setChatItem] = useState<string | undefined>();
  useEffect(() => { void getHealth().then(setOnline); }, []);
  async function handleLogin(email: string, password: string) { await login(email, password); setAuthenticated(true); }
  async function handleRegister(email: string, nickname: string, password: string) { await register(email, nickname, password); setAuthenticated(true); }
  function addPost(input: NewPostInput) {
    setPosts((current) => [{ id: String(Date.now()), emoji: '🥕', name: input.name, title: input.title, type: input.type, distance: '0km', dDay: input.expiryDate, place: input.place, color: '#E6F4DE' }, ...current]);
    setTab('home');
  }
  if (!authenticated) return <SafeAreaView style={styles.outer}><View style={styles.phone}><AuthScreen onLogin={handleLogin} onRegister={handleRegister} onDemo={() => setAuthenticated(true)} /></View></SafeAreaView>;
  if (selectedPost) return <SafeAreaView style={styles.outer}><View style={styles.phone}><PostDetailScreen post={selectedPost} onBack={() => setSelectedPost(null)} onChat={() => { setChatItem(selectedPost.name); setSelectedPost(null); setTab('chat'); }} /></View></SafeAreaView>;
  return <SafeAreaView style={styles.outer}><StatusBar style="dark" />
    <View style={styles.phone}>
      <View style={[styles.connection, online ? styles.online : styles.demo]}><Text style={styles.connectionText}>{online ? '● API 연결됨' : '● 데모 데이터'}</Text></View>
      <View style={styles.content}>{tab === 'home' ? <HomeScreen posts={posts} onSelectPost={setSelectedPost} /> : tab === 'add' ? <AddScreen onSubmit={addPost} /> : tab === 'chat' ? <ChatScreen startItem={chatItem} /> : <ProfileScreen />}</View>
      <View style={styles.nav}>{tabs.map((item) => <Pressable key={item.key} onPress={() => setTab(item.key)} style={styles.navItem}>
        <Text style={[styles.navIcon, tab === item.key && styles.active]}>{item.icon}</Text><Text style={[styles.navLabel, tab === item.key && styles.active]}>{item.label}</Text>
      </Pressable>)}</View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#DDEAE2' : '#F8FBF9', alignItems: 'center' },
  phone: { flex: 1, width: '100%', maxWidth: 460, backgroundColor: '#F8FBF9', position: 'relative', ...(Platform.OS === 'web' ? { marginVertical: 18, borderRadius: 28, overflow: 'hidden', boxShadow: '0 18px 60px rgba(24,70,49,.18)' } : {}) },
  connection: { position: 'absolute', zIndex: 5, right: 15, top: 8, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }, online: { backgroundColor: '#DDF3E4' }, demo: { backgroundColor: '#FFF0C9' }, connectionText: { fontSize: 9, fontWeight: '800', color: '#42614F' },
  content: { flex: 1 }, nav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 78, flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#DFE9E3', paddingBottom: 10 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navIcon: { fontSize: 23, color: '#97A49C', fontWeight: '700' }, navLabel: { fontSize: 10, color: '#97A49C', marginTop: 3, fontWeight: '700' }, active: { color: '#19734B' },
});
