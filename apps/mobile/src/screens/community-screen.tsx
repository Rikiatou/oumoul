import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AuthUser } from '@oumoul/api';
import { BackButton } from '../components/BackButton';
import { palette } from '../theme';
import { awardEvent } from '../gamification/gamification-events';
import { communityApi, type ReportReason } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────

type PostType = 'achievement' | 'milestone' | 'question' | 'tip' | 'motivation';

interface Post {
  id: string;
  authorId: string;
  author: string;
  initials: string;
  avatarColor: string;
  type: PostType;
  content: string;
  likes: number;
  likedByMe: boolean;
  date: string;
  tags: string[];
}

const REPORT_REASONS: Array<{ value: ReportReason; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'INAPPROPRIATE', label: 'Contenu inapproprié', icon: 'alert-circle' },
  { value: 'SPAM', label: 'Spam', icon: 'mail-unread' },
  { value: 'HATE_SPEECH', label: 'Discours haineux', icon: 'ban' },
  { value: 'MISINFORMATION', label: 'Désinformation islamique', icon: 'warning' },
  { value: 'OTHER', label: 'Autre raison', icon: 'flag' },
];

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  durationDays: number;
  participants: number;
  joined: boolean;
}

const AVATAR_COLORS = ['#1565C0', '#2E7D32', '#6A1B9A', '#C62828', '#E65100', '#00695C', '#AD1457'];

const TYPE_CONFIG: Record<PostType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  achievement: { label: 'Accomplissement', icon: 'trophy', color: '#F57F17' },
  milestone: { label: 'Étape', icon: 'flag', color: '#1565C0' },
  question: { label: 'Question', icon: 'help-circle', color: '#6A1B9A' },
  tip: { label: 'Conseil', icon: 'bulb', color: '#2E7D32' },
  motivation: { label: 'Motivation', icon: 'heart', color: '#C62828' },
};

function avatarColor(initials: string): string {
  const i = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function CommunityScreen({ user, onBack }: { user: AuthUser; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'feed' | 'challenges'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<PostType>('motivation');
  const [filterType, setFilterType] = useState<PostType | 'all'>('all');
  const [posting, setPosting] = useState(false);
  const [menuPost, setMenuPost] = useState<Post | null>(null);
  const [reportPost, setReportPost] = useState<Post | null>(null);
  const [selectedReason, setSelectedReason] = useState<ReportReason>('INAPPROPRIATE');
  const [reporting, setReporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const loadPosts = useCallback(async (p = 1) => {
    if (p === 1) setLoadingPosts(true);
    else setLoadingMore(true);
    try {
      const res = await communityApi.getPosts(p);
      if (!isMounted.current) return;
      const mapped: Post[] = res.posts.map((raw) => ({
        id: raw.id,
        authorId: raw.authorId,
        author: raw.author,
        initials: raw.initials,
        avatarColor: avatarColor(raw.initials),
        type: raw.type as PostType,
        content: raw.content,
        likes: raw.likes,
        likedByMe: raw.likedByMe,
        date: raw.createdAt.slice(0, 10),
        tags: raw.tags,
      }));
      setPosts((prev) => (p === 1 ? mapped : [...prev, ...mapped]));
      setHasMore(res.hasMore);
      setPage(p);
    } catch {
      // network error — silently fail, show whatever we have
    } finally {
      if (isMounted.current) { setLoadingPosts(false); setLoadingMore(false); }
    }
  }, []);

  const loadChallenges = useCallback(async () => {
    setLoadingChallenges(true);
    try {
      const data = await communityApi.getChallenges();
      if (isMounted.current) setChallenges(data as Challenge[]);
    } catch { /* silent */ } finally {
      if (isMounted.current) setLoadingChallenges(false);
    }
  }, []);

  useEffect(() => { void loadPosts(1); }, [loadPosts]);
  useEffect(() => { void loadChallenges(); }, [loadChallenges]);

  const handleLike = useCallback(async (id: string) => {
    setPosts((prev) => prev.map((p) =>
      p.id === id ? { ...p, likes: p.likedByMe ? p.likes - 1 : p.likes + 1, likedByMe: !p.likedByMe } : p
    ));
    try {
      const res = await communityApi.toggleLike(id);
      setPosts((prev) => prev.map((p) => p.id === id ? { ...p, likes: res.likes, likedByMe: res.liked } : p));
    } catch { /* revert on error */ void loadPosts(1); }
  }, [loadPosts]);

  const handlePost = useCallback(async () => {
    if (!newContent.trim() || posting) return;
    setPosting(true);
    try {
      await communityApi.createPost({ type: newType, content: newContent.trim() });
      void awardEvent('community_post');
      setNewContent('');
      setShowNewPost(false);
      await loadPosts(1);
    } catch (e: any) {
      showToast(e?.message?.includes('inappropri') ? 'Contenu non autorisé. Merci de respecter les règles.' : 'Erreur lors de la publication.');
    } finally {
      setPosting(false);
    }
  }, [newContent, newType, posting, loadPosts, showToast]);

  const handleReport = useCallback(async () => {
    if (!reportPost || reporting) return;
    setReporting(true);
    try {
      const res = await communityApi.reportPost(reportPost.id, selectedReason);
      setReportPost(null);
      if (res.autoHidden) {
        setPosts((prev) => prev.filter((p) => p.id !== reportPost.id));
        showToast('Post signalé et masqué. Merci.');
      } else {
        showToast('Signalé. Nos modérateurs vont examiner ce post.');
      }
    } catch { showToast('Erreur lors du signalement.'); } finally {
      setReporting(false);
    }
  }, [reportPost, selectedReason, reporting, showToast]);

  const handleBlock = useCallback(async (targetUser: Post) => {
    setMenuPost(null);
    try {
      await communityApi.blockUser(targetUser.authorId);
      setPosts((prev) => prev.filter((p) => p.authorId !== targetUser.authorId));
      showToast(`${targetUser.author} a été bloqué(e). Ses posts ne s'afficheront plus.`);
    } catch { showToast('Erreur lors du blocage.'); }
  }, [showToast]);

  const handleJoinChallenge = useCallback(async (id: string) => {
    setChallenges((prev) => prev.map((c) =>
      c.id === id ? { ...c, joined: !c.joined, participants: c.joined ? c.participants - 1 : c.participants + 1 } : c
    ));
    try {
      const res = await communityApi.toggleChallenge(id);
      setChallenges((prev) => prev.map((c) => c.id === id ? { ...c, joined: res.joined, participants: res.participants } : c));
    } catch { void loadChallenges(); }
  }, [loadChallenges]);

  const filteredPosts = useMemo(() => {
    if (filterType === 'all') return posts;
    return posts.filter((p) => p.type === filterType);
  }, [posts, filterType]);

  return (
    <View style={[cm.screen, { paddingTop: insets.top }]}>
      {/* Toast */}
      {toast && (
        <View style={cm.toast}>
          <Text style={cm.toastText}>{toast}</Text>
        </View>
      )}
      {/* Header */}
      <View style={cm.header}>
        <BackButton onPress={onBack} />
        <Text style={cm.headerTitle}>Communauté</Text>
        <TouchableOpacity style={cm.newPostBtn} onPress={() => setShowNewPost(true)}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={cm.tabs}>
        <TouchableOpacity style={[cm.tab, activeTab === 'feed' && cm.tabActive]} onPress={() => setActiveTab('feed')}>
          <Ionicons name="newspaper" size={16} color={activeTab === 'feed' ? palette.primaryDark : palette.muted} />
          <Text style={[cm.tabText, activeTab === 'feed' && cm.tabTextActive]}>Fil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[cm.tab, activeTab === 'challenges' && cm.tabActive]} onPress={() => setActiveTab('challenges')}>
          <Ionicons name="trophy" size={16} color={activeTab === 'challenges' ? palette.primaryDark : palette.muted} />
          <Text style={[cm.tabText, activeTab === 'challenges' && cm.tabTextActive]}>Défis</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'feed' ? (
        <>
          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={cm.filterScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            <TouchableOpacity
              style={[cm.filterChip, filterType === 'all' && cm.filterChipActive]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[cm.filterText, filterType === 'all' && { color: '#fff' }]}>Tout</Text>
            </TouchableOpacity>
            {(Object.keys(TYPE_CONFIG) as PostType[]).map((t) => {
              const cfg = TYPE_CONFIG[t];
              return (
                <TouchableOpacity
                  key={t}
                  style={[cm.filterChip, filterType === t && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                  onPress={() => setFilterType(filterType === t ? 'all' : t)}
                >
                  <Ionicons name={cfg.icon} size={13} color={filterType === t ? '#fff' : palette.textSoft} />
                  <Text style={[cm.filterText, filterType === t && { color: '#fff' }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {loadingPosts ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
              <ActivityIndicator size="large" color={palette.primaryDark} />
            </View>
          ) : (
          <FlatList
            data={filteredPosts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            onEndReached={() => { if (hasMore && !loadingMore) void loadPosts(page + 1); }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={palette.primaryDark} style={{ marginBottom: 20 }} /> : null}
            renderItem={({ item }) => {
              const cfg = TYPE_CONFIG[item.type];
              return (
                <View style={cm.postCard}>
                  <View style={cm.postHeader}>
                    <View style={[cm.avatar, { backgroundColor: item.avatarColor }]}>
                      <Text style={cm.avatarText}>{item.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={cm.postAuthor}>{item.author}</Text>
                      <Text style={cm.postDate}>{item.date}</Text>
                    </View>
                    <View style={[cm.typeBadge, { backgroundColor: cfg.color + '22' }]}>
                      <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                      <Text style={[cm.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  <Text style={cm.postContent}>{item.content}</Text>
                  <View style={cm.postFooter}>
                    <TouchableOpacity style={cm.likeBtn} onPress={() => void handleLike(item.id)}>
                      <Ionicons name={item.likedByMe ? 'heart' : 'heart-outline'} size={18} color={item.likedByMe ? '#C62828' : palette.muted} />
                      <Text style={[cm.likeCount, item.likedByMe && { color: '#C62828' }]}>{item.likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={cm.moreBtn} onPress={() => setMenuPost(item)}>
                      <Ionicons name="ellipsis-horizontal" size={18} color={palette.muted} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={cm.emptyBox}>
                <Ionicons name="people-outline" size={40} color={palette.muted} />
                <Text style={cm.emptyText}>Sois le premier à partager !</Text>
              </View>
            }
          />
          )}
        </>
      ) : (
        /* Challenges */
        <FlatList
          data={challenges}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ListHeaderComponent={
            <Text style={cm.challengesIntro}>Rejoins un défi communautaire et progresse avec tes frères et sœurs !</Text>
          }
          renderItem={({ item }) => (
            <View style={[cm.challengeCard, item.joined && { borderColor: item.color }]}>
              <View style={[cm.challengeIcon, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={cm.challengeTitle}>{item.title}</Text>
                <Text style={cm.challengeDesc}>{item.description}</Text>
                <View style={cm.challengeMeta}>
                  <Ionicons name="time-outline" size={13} color={palette.muted} />
                  <Text style={cm.challengeMetaText}>{item.durationDays} jours</Text>
                  <Ionicons name="people-outline" size={13} color={palette.muted} />
                  <Text style={cm.challengeMetaText}>{item.participants} participants</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[cm.joinBtn, { backgroundColor: item.joined ? '#E8F5E9' : item.color }]}
                onPress={() => void handleJoinChallenge(item.id)}
              >
                <Text style={[cm.joinBtnText, { color: item.joined ? '#2E7D32' : '#fff' }]}>
                  {item.joined ? 'Rejoint ✓' : 'Rejoindre'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Context Menu Modal */}
      <Modal visible={!!menuPost} animationType="fade" transparent statusBarTranslucent>
        <TouchableOpacity style={cm.modalOverlay} activeOpacity={1} onPress={() => setMenuPost(null)}>
          <View style={[cm.menuCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={cm.modalHandle} />
            <Text style={cm.menuAuthor}>{menuPost?.author}</Text>
            <TouchableOpacity style={cm.menuItem} onPress={() => { const p = menuPost; setMenuPost(null); setReportPost(p); }}>
              <Ionicons name="flag-outline" size={20} color="#C62828" />
              <Text style={[cm.menuItemText, { color: '#C62828' }]}>Signaler ce post</Text>
            </TouchableOpacity>
            {menuPost && menuPost.authorId !== user.email && (
              <TouchableOpacity style={cm.menuItem} onPress={() => menuPost && void handleBlock(menuPost)}>
                <Ionicons name="ban-outline" size={20} color="#C62828" />
                <Text style={[cm.menuItemText, { color: '#C62828' }]}>Bloquer {menuPost?.author}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={cm.menuItem} onPress={() => setMenuPost(null)}>
              <Ionicons name="close" size={20} color={palette.textSoft} />
              <Text style={[cm.menuItemText, { color: palette.textSoft }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Modal */}
      <Modal visible={!!reportPost} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={cm.modalOverlay} activeOpacity={1} onPress={() => setReportPost(null)}>
            <TouchableOpacity activeOpacity={1} style={cm.modalCard}>
              <View style={cm.modalHandle} />
              <View style={cm.modalHeader}>
                <Text style={cm.modalTitle}>Signaler ce post</Text>
                <TouchableOpacity onPress={() => setReportPost(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={palette.text} />
                </TouchableOpacity>
              </View>
              <Text style={[cm.fieldLabel, { marginBottom: 12 }]}>Raison du signalement</Text>
              {REPORT_REASONS.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[cm.reasonRow, selectedReason === r.value && { backgroundColor: '#FFF1F0', borderColor: '#FECACA' }]}
                  onPress={() => setSelectedReason(r.value)}
                >
                  <View style={[cm.reasonIcon, selectedReason === r.value && { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name={r.icon} size={18} color={selectedReason === r.value ? '#C62828' : palette.textSoft} />
                  </View>
                  <Text style={[cm.reasonText, { color: selectedReason === r.value ? '#C62828' : palette.text }]}>{r.label}</Text>
                  {selectedReason === r.value && <Ionicons name="checkmark-circle" size={18} color="#C62828" />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[cm.submitBtn, { backgroundColor: '#C62828', marginTop: 16 }]}
                onPress={() => void handleReport()}
                disabled={reporting}
              >
                {reporting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Ionicons name="flag" size={18} color="#fff" /><Text style={cm.submitBtnText}>Envoyer le signalement</Text></>
                }
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* New Post Modal */}
      <Modal visible={showNewPost} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={cm.modalOverlay} activeOpacity={1} onPress={() => setShowNewPost(false)}>
            <TouchableOpacity activeOpacity={1} style={cm.modalCard}>
              <View style={cm.modalHandle} />
              <View style={cm.modalHeader}>
                <Text style={cm.modalTitle}>Nouveau post</Text>
                <TouchableOpacity onPress={() => setShowNewPost(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={palette.text} />
                </TouchableOpacity>
              </View>

              <Text style={cm.fieldLabel}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
                {(Object.keys(TYPE_CONFIG) as PostType[]).map((t) => {
                  const cfg = TYPE_CONFIG[t];
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[cm.typeChip, newType === t && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                      onPress={() => setNewType(t)}
                    >
                      <Ionicons name={cfg.icon} size={14} color={newType === t ? '#fff' : palette.textSoft} />
                      <Text style={[cm.typeChipText, newType === t && { color: '#fff' }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={cm.fieldLabel}>Partage avec la communauté</Text>
              <TextInput
                style={cm.textArea}
                placeholder="Ton accomplissement, conseil, question ou message d'encouragement..."
                placeholderTextColor={palette.muted}
                value={newContent}
                onChangeText={setNewContent}
                multiline
                autoFocus
              />

              <TouchableOpacity style={cm.submitBtn} onPress={() => void handlePost()}>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={cm.submitBtnText}>Publier</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cm = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: palette.text },
  newPostBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.primaryDark, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, backgroundColor: palette.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: palette.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  tabActive: { backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border },
  tabText: { fontSize: 14, fontWeight: '600', color: palette.muted },
  tabTextActive: { color: palette.primaryDark },
  filterScroll: { maxHeight: 44, marginBottom: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  filterChipActive: { backgroundColor: palette.primaryDark, borderColor: palette.primaryDark },
  filterText: { fontSize: 12, fontWeight: '600', color: palette.textSoft },
  postCard: { backgroundColor: palette.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: palette.border },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  postAuthor: { fontSize: 13, fontWeight: '700', color: palette.text },
  postDate: { fontSize: 11, color: palette.muted },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  postContent: { fontSize: 14, color: palette.text, lineHeight: 21, marginBottom: 12 },
  postFooter: { flexDirection: 'row', alignItems: 'center' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  likeCount: { fontSize: 13, fontWeight: '600', color: palette.muted },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: palette.muted },
  challengesIntro: { fontSize: 13, color: palette.textSoft, marginBottom: 14, lineHeight: 20 },
  challengeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: palette.border, gap: 12 },
  challengeIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  challengeTitle: { fontSize: 14, fontWeight: '700', color: palette.text },
  challengeDesc: { fontSize: 12, color: palette.textSoft, marginTop: 2, lineHeight: 17 },
  challengeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  challengeMetaText: { fontSize: 11, color: palette.muted },
  joinBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexShrink: 0 },
  joinBtnText: { fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: palette.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: palette.border, alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: palette.text },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: palette.text, marginBottom: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border },
  typeChipText: { fontSize: 12, fontWeight: '600', color: palette.textSoft },
  textArea: { backgroundColor: palette.card, borderRadius: 12, padding: 14, fontSize: 14, color: palette.text, borderWidth: 1, borderColor: palette.border, minHeight: 100, textAlignVertical: 'top', marginBottom: 14 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.primaryDark, borderRadius: 12, paddingVertical: 14 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  moreBtn: { marginLeft: 'auto', padding: 4 },
  toast: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#1B3A2D', borderRadius: 12, padding: 14, zIndex: 999, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  menuCard: { backgroundColor: palette.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  menuAuthor: { fontSize: 13, fontWeight: '700', color: palette.textSoft, textAlign: 'center', marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: palette.border },
  menuItemText: { fontSize: 15, fontWeight: '600' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.border, marginBottom: 8 },
  reasonIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  reasonText: { flex: 1, fontSize: 14, fontWeight: '600' },
});
