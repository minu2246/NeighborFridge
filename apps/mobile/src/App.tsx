import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { createPost, getHealth, getNeighborhood, getReviewNotifications, listLikedPostIds, listPosts, login, logout, openChatRoom, register, restoreSession, saveNeighborhood, setPostLiked, updatePostStatus, USE_LOCAL_STORE } from './api/client';
import { demoPosts } from './data/demo';
import { AddScreen } from './screens/AddScreen';
import { ChatScreen } from './screens/ChatScreen';
import { HomeScreen } from './screens/HomeScreen';
import { AuthScreen } from './screens/AuthScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { PostDetailScreen } from './screens/PostDetailScreen';
import { LocationScreen } from './screens/LocationScreen';
import { ChatTarget, FoodPost, Neighborhood, NewPostInput, ReviewNotifications, TabName } from './types';

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
  const [chatTarget, setChatTarget] = useState<ChatTarget | undefined>();
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [locationChecked, setLocationChecked] = useState(false);
  const [only, setOnly] = useState<'mine' | 'liked' | undefined>();
  const [reviewNotice, setReviewNotice] = useState<ReviewNotifications>({ pendingReviews: 0, newReviews: 0 });
  const [nickname, setNickname] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);
  useEffect(() => { void getHealth().then(setOnline); }, []);
  useEffect(() => {
    void restoreSession().then((user) => { if (user) { setNickname(user.nickname); setAuthenticated(true); } }).finally(() => setRestoring(false));
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'android' || !authenticated) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedPost) { setSelectedPost(null); return true; }
      if (tab !== 'home') { setTab('home'); return true; }
      return true;
    });
    return () => subscription.remove();
  }, [authenticated, selectedPost, tab]);
  useEffect(() => {
    if (!authenticated) return;
    void getNeighborhood().then(setNeighborhood).catch(() => undefined).finally(() => setLocationChecked(true));
  }, [authenticated]);
  useEffect(() => {
    if (!authenticated || !neighborhood) return;
    void Promise.all([listPosts(neighborhood), listLikedPostIds().catch((): string[] => [])]).then(([saved, liked]) => {
      if (saved.length > 0 || !USE_LOCAL_STORE) setPosts(saved.map((post) => ({ ...post, liked: liked.includes(post.id) })));
    }).catch(() => undefined);
  }, [authenticated, neighborhood]);
  // 후기 알림: 탭을 옮길 때마다 갱신. 프로필을 보고 있으면 새 후기는 읽은 것으로 보고 배지에서 뺌
  useEffect(() => {
    if (!authenticated || !nickname) return;
    void getReviewNotifications().then(setReviewNotice).catch(() => undefined);
  }, [authenticated, nickname, tab]);
  const profileBadge = reviewNotice.pendingReviews + (tab === 'profile' ? 0 : reviewNotice.newReviews);
  async function updateNeighborhood(value: Neighborhood) {
    const saved = await saveNeighborhood(value).catch(() => value);
    setNeighborhood(saved);
  }
  async function handleLogin(email: string, password: string) { const result = await login(email, password); setNickname(result.user.nickname); setAuthenticated(true); }
  async function handleRegister(email: string, name: string, password: string) { const result = await register(email, name, password); setNickname(result.user.nickname); setAuthenticated(true); }
  async function handleLogout() {
    await logout();
    setAuthenticated(false); setNickname(null); setNeighborhood(null); setLocationChecked(false);
    setPosts(demoPosts); setSelectedPost(null); setChatTarget(undefined); setOnly(undefined); setTab('home');
  }
  async function addPost(input: NewPostInput) {
    if (!neighborhood) throw new Error('동네를 먼저 인증해 주세요.');
    const saved = await createPost(input, neighborhood);
    setPosts((current) => [saved, ...current]);
    setTab('home');
  }
  async function changePostStatus(status: 'ACTIVE' | 'RESERVED' | 'COMPLETED', completedWith?: string) {
    if (!selectedPost) return;
    await updatePostStatus(selectedPost.id, status, completedWith);
    const updated = { ...selectedPost, status };
    if (status === 'COMPLETED') { setPosts((current) => current.filter((post) => post.id !== updated.id)); setSelectedPost(null); return; }
    setPosts((current) => current.map((post) => post.id === updated.id ? updated : post));
    setSelectedPost(updated);
  }
  async function toggleLike() {
    if (!selectedPost) return;
    const updated = { ...selectedPost, liked: !selectedPost.liked };
    await setPostLiked(updated.id, updated.liked);
    setPosts((current) => current.map((post) => post.id === updated.id ? updated : post));
    setSelectedPost(updated);
  }
  if (restoring) return <SafeAreaView style={styles.outer}><View style={styles.phone} /></SafeAreaView>;
  if (!authenticated) return <SafeAreaView style={styles.outer}><View style={styles.phone}><AuthScreen onLogin={handleLogin} onRegister={handleRegister} onDemo={() => setAuthenticated(true)} /></View></SafeAreaView>;
  if (locationChecked && !neighborhood) return <SafeAreaView style={styles.outer}><View style={styles.phone}><LocationScreen onComplete={updateNeighborhood} /></View></SafeAreaView>;
  if (selectedPost) return <SafeAreaView style={styles.outer}><View style={styles.phone}><PostDetailScreen post={selectedPost} onBack={() => setSelectedPost(null)} onToggleLike={selectedPost.isMine || USE_LOCAL_STORE || !nickname ? undefined : toggleLike} onStatusChange={selectedPost.isMine ? changePostStatus : undefined} onChat={selectedPost.isMine && !USE_LOCAL_STORE ? undefined : async () => { setChatTarget(await openChatRoom(selectedPost)); setSelectedPost(null); setTab('chat'); }} /></View></SafeAreaView>;
  return <SafeAreaView style={styles.outer}><StatusBar style="dark" />
    <View style={styles.phone}>
      <View style={[styles.connection, online ? styles.online : styles.demo]}><Text style={styles.connectionText}>{online ? '● API 연결됨' : '● 데모 데이터'}</Text></View>
      <View style={styles.content}>{tab === 'home' ? <HomeScreen posts={posts} neighborhood={neighborhood} only={only} onShowAll={() => setOnly(undefined)} onNeighborhoodChange={updateNeighborhood} onSelectPost={setSelectedPost} /> : tab === 'add' ? <AddScreen onSubmit={addPost} /> : tab === 'chat' ? <ChatScreen startTarget={chatTarget} /> : <ProfileScreen nickname={nickname} onLogout={() => void handleLogout()} neighborhood={neighborhood} postCount={posts.filter((post) => post.isMine).length} onMyPosts={() => { setOnly('mine'); setTab('home'); }} likedCount={posts.filter((post) => post.liked).length} onLiked={() => { setOnly('liked'); setTab('home'); }} onNicknameChange={setNickname} onResetLocation={() => setNeighborhood(null)} />}</View>
      <View style={styles.nav}>{tabs.map((item) => <Pressable key={item.key} onPress={() => { if (item.key === 'home') setOnly(undefined); setTab(item.key); }} style={styles.navItem}>
        <Text style={[styles.navIcon, tab === item.key && styles.active]}>{item.icon}</Text>{item.key === 'profile' && profileBadge > 0 ? <Text style={styles.badge} accessibilityLabel={`후기 알림 ${profileBadge}개`}>{profileBadge}</Text> : null}<Text style={[styles.navLabel, tab === item.key && styles.active]}>{item.label}</Text>
      </Pressable>)}</View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Platform.OS === 'web' ? '#DDEAE2' : '#F8FBF9', alignItems: 'center' },
  phone: { flex: 1, width: '100%', maxWidth: 460, backgroundColor: '#F8FBF9', position: 'relative', ...(Platform.OS === 'web' ? { marginVertical: 18, borderRadius: 28, overflow: 'hidden', boxShadow: '0 18px 60px rgba(24,70,49,.18)' } : {}) },
  connection: { position: 'absolute', zIndex: 5, right: 15, top: 8, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }, online: { backgroundColor: '#DDF3E4' }, demo: { backgroundColor: '#FFF0C9' }, connectionText: { fontSize: 9, fontWeight: '800', color: '#42614F' },
  content: { flex: 1 }, nav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 78, flexDirection: 'row', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#DFE9E3', paddingBottom: 10 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' }, navIcon: { fontSize: 23, color: '#97A49C', fontWeight: '700' }, navLabel: { fontSize: 10, color: '#97A49C', marginTop: 3, fontWeight: '700' }, active: { color: '#19734B' }, badge: { position: 'absolute', top: 8, left: '58%', minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: '#D4553B', color: '#FFF', fontSize: 11, fontWeight: '900', textAlign: 'center', lineHeight: 18, overflow: 'hidden' },
});
