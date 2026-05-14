import * as SecureStore from "expo-secure-store";

const SOCIAL_KEY = "oumoul_social_features";

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  totalPoints: number;
  achievements: string[];
  currentStreak: number;
  longestStreak: number;
  privacy: "public" | "friends" | "private";
  bio?: string;
  joinedAt: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  type: "achievement" | "milestone" | "question" | "tip" | "motivation";
  attachments?: {
    type: "image" | "achievement";
    url: string;
  }[];
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  isLiked?: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: "individual" | "group" | "community";
  duration: number; // days
  participants: string[];
  rewards: {
    points: number;
    badge: string;
  };
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy: string;
}

export interface SocialFeatures {
  profile: UserProfile;
  friends: string[];
  posts: CommunityPost[];
  challenges: Challenge[];
  notifications: {
    type: "like" | "comment" | "friend_request" | "challenge_invite" | "achievement";
    fromUserId: string;
    fromUserName: string;
    message: string;
    createdAt: string;
    read: boolean;
  }[];
}

export async function loadSocialFeatures(): Promise<SocialFeatures> {
  try {
    const stored = await SecureStore.getItemAsync(SOCIAL_KEY);
    return stored ? JSON.parse(stored) : {
      profile: {
        id: "user_" + Math.random().toString(36).substr(2, 9),
        name: "Utilisateur Oumoul",
        level: 1,
        totalPoints: 0,
        achievements: [],
        currentStreak: 0,
        longestStreak: 0,
        privacy: "friends",
        joinedAt: new Date().toISOString(),
      },
      friends: [],
      posts: [],
      challenges: [],
      notifications: [],
    };
  } catch {
    return {
      profile: {
        id: "user_" + Math.random().toString(36).substr(2, 9),
        name: "Utilisateur Oumoul",
        level: 1,
        totalPoints: 0,
        achievements: [],
        currentStreak: 0,
        longestStreak: 0,
        privacy: "friends",
        joinedAt: new Date().toISOString(),
      },
      friends: [],
      posts: [],
      challenges: [],
      notifications: [],
    };
  }
}

export async function saveSocialFeatures(social: SocialFeatures): Promise<void> {
  try {
    await SecureStore.setItemAsync(SOCIAL_KEY, JSON.stringify(social));
  } catch (error) {
    console.error("Failed to save social features:", error);
  }
}

export async function shareProgress(type: "daily" | "weekly" | "achievement", data?: any): Promise<string> {
  const social = await loadSocialFeatures();
  
  const post: CommunityPost = {
    id: "post_" + Math.random().toString(36).substr(2, 9),
    userId: social.profile.id,
    userName: social.profile.name,
    userAvatar: social.profile.avatar,
    content: generatePostContent(type, data),
    type: type === "achievement" ? "achievement" : "milestone",
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: new Date().toISOString(),
  };

  social.posts.unshift(post);
  await saveSocialFeatures(social);
  
  return post.id;
}

function generatePostContent(type: string, data?: any): string {
  switch (type) {
    case "daily":
      return `🕌 Journée spirituelle accomplie ! ${data?.tasksCompleted || 0} tâches complétées aujourd'hui.`;
    case "weekly":
      return `📅 Semaine productive ! ${data?.streak || 0} jours d'utilisation continue.`;
    case "achievement":
      return `🏆 Nouveau succès débloqué : ${data?.title || "Mystère"} ! Alhamdulillah !`;
    default:
      return "🌟 Progression spirituelle partagée";
  }
}

export async function likePost(postId: string): Promise<void> {
  const social = await loadSocialFeatures();
  const post = social.posts.find(p => p.id === postId);
  
  if (post) {
    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;
    await saveSocialFeatures(social);
  }
}

export async function addFriend(friendId: string): Promise<void> {
  const social = await loadSocialFeatures();
  
  if (!social.friends.includes(friendId)) {
    social.friends.push(friendId);
    await saveSocialFeatures(social);
  }
}

export async function createChallenge(title: string, description: string, type: "individual" | "group" | "community", duration: number): Promise<string> {
  const social = await loadSocialFeatures();
  
  const challenge: Challenge = {
    id: "challenge_" + Math.random().toString(36).substr(2, 9),
    title,
    description,
    type,
    duration,
    participants: [social.profile.id],
    rewards: {
      points: duration * 10,
      badge: "challenge_" + Math.random().toString(36).substr(2, 6),
    },
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    createdBy: social.profile.id,
  };

  social.challenges.push(challenge);
  await saveSocialFeatures(social);
  
  return challenge.id;
}

export async function joinChallenge(challengeId: string): Promise<void> {
  const social = await loadSocialFeatures();
  const challenge = social.challenges.find(c => c.id === challengeId);
  
  if (challenge && !challenge.participants.includes(social.profile.id)) {
    challenge.participants.push(social.profile.id);
    await saveSocialFeatures(social);
  }
}

export async function getCommunityFeed(): Promise<CommunityPost[]> {
  const social = await loadSocialFeatures();
  
  // In a real app, this would fetch from backend
  // For now, return mock posts from friends and public posts
  const mockPosts: CommunityPost[] = [
    {
      id: "mock_1",
      userId: "friend_1",
      userName: "Ahmed",
      content: "🕌 Alhamdulillah ! Aujourd'hui j'ai complété toutes mes prières à l'heure",
      type: "milestone",
      likes: 15,
      comments: 3,
      shares: 1,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "mock_2",
      userId: "friend_2",
      userName: "Fatima",
      content: "📖 J'ai fini ma lecture du Coran aujourd'hui ! 600 pages complétées",
      type: "achievement",
      likes: 25,
      comments: 5,
      shares: 2,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "mock_3",
      userId: "friend_3",
      userName: "Yusuf",
      content: "💡 Conseil : Essayez de lire le Coran après la prière du Fajr, c'est très bénéfique",
      type: "tip",
      likes: 8,
      comments: 2,
      shares: 0,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return [...social.posts, ...mockPosts].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 20);
}

export async function getActiveChallenges(): Promise<Challenge[]> {
  const social = await loadSocialFeatures();
  
  // Mock challenges
  const mockChallenges: Challenge[] = [
    {
      id: "challenge_ramadan",
      title: "Défi Ramadan 2025",
      description: "Complétez tous les jours de jeûne avec suivi spirituel",
      type: "community",
      duration: 30,
      participants: ["user_1", "user_2", "user_3"],
      rewards: { points: 500, badge: "ramadan_hero" },
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      createdBy: "admin",
    },
    {
      id: "challenge_quran",
      title: "30 jours de Coran",
      description: "Lisez au moins 1 page du Coran chaque jour pendant 30 jours",
      type: "individual",
      duration: 30,
      participants: ["user_4", "user_5"],
      rewards: { points: 300, badge: "quran_dedicated" },
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      createdBy: "user_4",
    },
  ];

  return [...social.challenges, ...mockChallenges].filter(c => c.isActive);
}

export async function getLeaderboard(category: "points" | "streak" | "achievements" = "points"): Promise<Array<{
  rank: number;
  user: UserProfile;
  value: number;
}>> {
  // Mock leaderboard data
  const mockUsers: UserProfile[] = [
    {
      id: "leader_1",
      name: "Abdullah",
      level: 15,
      totalPoints: 3500,
      achievements: ["achievement_1", "achievement_2"],
      currentStreak: 150,
      longestStreak: 200,
      privacy: "public",
      joinedAt: "2024-01-01",
    },
    {
      id: "leader_2",
      name: "Aisha",
      level: 12,
      totalPoints: 2800,
      achievements: ["achievement_1"],
      currentStreak: 90,
      longestStreak: 120,
      privacy: "public",
      joinedAt: "2024-02-01",
    },
    {
      id: "leader_3",
      name: "Omar",
      level: 10,
      totalPoints: 2200,
      achievements: ["achievement_3"],
      currentStreak: 60,
      longestStreak: 80,
      privacy: "public",
      joinedAt: "2024-03-01",
    },
  ];

  return mockUsers
    .map((user, index) => ({
      rank: index + 1,
      user,
      value: category === "points" ? user.totalPoints : 
             category === "streak" ? user.currentStreak : 
             user.achievements.length,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

export async function sendMotivation(message: string, recipientId: string): Promise<void> {
  const social = await loadSocialFeatures();
  
  const notification = {
    type: "motivation" as const,
    fromUserId: social.profile.id,
    fromUserName: social.profile.name,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  };

  // In a real app, this would send to backend
  console.log("Motivation sent:", notification);
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
  const social = await loadSocialFeatures();
  
  social.profile = { ...social.profile, ...updates };
  await saveSocialFeatures(social);
}

// Helper functions for UI
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  
  return date.toLocaleDateString('fr-FR');
}

export function calculateLevel(points: number): number {
  return Math.floor(points / 200) + 1;
}

export function getPointsForNextLevel(currentPoints: number): number {
  const currentLevel = calculateLevel(currentPoints);
  const nextLevelPoints = currentLevel * 200;
  return nextLevelPoints - currentPoints;
}
