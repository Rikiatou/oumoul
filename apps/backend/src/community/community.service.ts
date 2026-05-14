import { Injectable, NotFoundException, ConflictException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ReportPostDto } from './dto/report-post.dto';

// ── Profanity filter (basic Islamic-safe wordlist) ────────────────────────────
const BANNED_WORDS = [
  'merde', 'putain', 'connard', 'salope', 'fuck', 'shit', 'bastard',
  'idiot', 'imbecile', 'con', 'bitch', 'ass', 'damn', 'cunt',
];

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((w) => lower.includes(w));
}

const AUTO_HIDE_THRESHOLD = 3; // auto-hide after 3 reports

const SEED_CHALLENGES = [
  { id: 'c1', title: '7 jours de Fajr', description: "Prier Fajr à l'heure pendant 7 jours consécutifs.", icon: 'sunny', color: '#F57F17', durationDays: 7 },
  { id: 'c2', title: 'Coran 20 min/jour', description: 'Lire le Coran 20 minutes chaque jour pendant 30 jours.', icon: 'book', color: '#2E7D32', durationDays: 30 },
  { id: 'c3', title: '100 Astaghfirullah', description: 'Dire Astaghfirullah 100 fois par jour pendant 10 jours.', icon: 'sparkles', color: '#6A1B9A', durationDays: 10 },
  { id: 'c4', title: 'Sadaqa quotidienne', description: 'Faire un geste charitable chaque jour pendant 21 jours.', icon: 'heart', color: '#C62828', durationDays: 21 },
];

@Injectable()
export class CommunityService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    for (const ch of SEED_CHALLENGES) {
      await this.prisma.communityChallenge.upsert({
        where: { id: ch.id },
        update: {},
        create: { ...ch, isActive: true },
      });
    }
  }

  // ── Posts ────────────────────────────────────────────────────────────────────

  async getPosts(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Get IDs of users this user has blocked or been blocked by
    const blocks = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const hiddenUserIds = new Set(
      blocks.flatMap((b) => [b.blockerId, b.blockedId]).filter((id) => id !== userId),
    );

    const where = {
      isHidden: false,
      userId: hiddenUserIds.size > 0 ? { notIn: [...hiddenUserIds] } : undefined,
    };

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.communityPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          likes: { where: { userId }, select: { id: true } },
        },
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    return {
      posts: posts.map((p) => ({
        id: p.id,
        authorId: p.user.id,
        author: `${p.user.firstName} ${p.user.lastName}`.trim(),
        initials: ((p.user.firstName?.[0] ?? '') + (p.user.lastName?.[0] ?? '')).toUpperCase(),
        type: p.type,
        content: p.content,
        tags: p.tags ? p.tags.split(',').map((t) => t.trim()) : [],
        likes: p.likeCount,
        likedByMe: p.likes.length > 0,
        createdAt: p.createdAt.toISOString(),
      })),
      total,
      page,
      hasMore: skip + posts.length < total,
    };
  }

  async createPost(userId: string, dto: CreatePostDto) {
    if (containsProfanity(dto.content)) {
      throw new ForbiddenException('Contenu inapproprié détecté. Merci de respecter les règles de la communauté.');
    }
    const post = await this.prisma.communityPost.create({
      data: {
        userId,
        type: dto.type,
        content: dto.content,
        tags: dto.tags ?? null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    return {
      id: post.id,
      author: `${post.user.firstName} ${post.user.lastName}`.trim(),
      initials: ((post.user.firstName?.[0] ?? '') + (post.user.lastName?.[0] ?? '')).toUpperCase(),
      type: post.type,
      content: post.content,
      tags: post.tags ? post.tags.split(',').map((t) => t.trim()) : [],
      likes: 0,
      likedByMe: false,
      createdAt: post.createdAt.toISOString(),
    };
  }

  async deletePost(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post introuvable');
    if (post.userId !== userId) throw new ConflictException('Pas autorisé');
    await this.prisma.communityPost.delete({ where: { id: postId } });
    return { success: true };
  }

  // ── Likes ────────────────────────────────────────────────────────────────────

  async toggleLike(userId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post introuvable');

    const existing = await this.prisma.communityLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.communityLike.delete({ where: { id: existing.id } }),
        this.prisma.communityPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return { liked: false, likes: Math.max(0, post.likeCount - 1) };
    } else {
      await this.prisma.$transaction([
        this.prisma.communityLike.create({ data: { postId, userId } }),
        this.prisma.communityPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
      ]);
      return { liked: true, likes: post.likeCount + 1 };
    }
  }

  // ── Moderation ─────────────────────────────────────────────────────────────

  async reportPost(reporterId: string, postId: string, dto: ReportPostDto) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post introuvable');
    if (post.userId === reporterId) throw new ForbiddenException('Tu ne peux pas signaler ton propre post');

    // Upsert: one report per user per post
    await this.prisma.postReport.upsert({
      where: { postId_reporterId: { postId, reporterId } },
      update: { reason: dto.reason as any, details: dto.details ?? null },
      create: { postId, reporterId, reason: dto.reason as any, details: dto.details ?? null },
    });

    // Increment report count + auto-hide if threshold reached
    const updated = await this.prisma.communityPost.update({
      where: { id: postId },
      data: {
        reportCount: { increment: 1 },
        isHidden: post.reportCount + 1 >= AUTO_HIDE_THRESHOLD ? true : undefined,
      },
    });

    return { success: true, autoHidden: updated.isHidden };
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new ForbiddenException('Tu ne peux pas te bloquer toi-même');
    await this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
    return { success: true, blocked: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
    return { success: true, blocked: false };
  }

  async getBlockedUsers(userId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: { id: true, firstName: true, lastName: true } } },
    });
    return blocks.map((b) => ({
      id: b.blocked.id,
      name: `${b.blocked.firstName} ${b.blocked.lastName}`.trim(),
    }));
  }

  // ── Challenges ───────────────────────────────────────────────────────────────

  async getChallenges(userId: string) {
    const challenges = await this.prisma.communityChallenge.findMany({
      where: { isActive: true },
      include: {
        participants: { where: { userId }, select: { id: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return challenges.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      icon: c.icon,
      color: c.color,
      durationDays: c.durationDays,
      participants: c._count.participants,
      joined: c.participants.length > 0,
    }));
  }

  async toggleChallenge(userId: string, challengeId: string) {
    const challenge = await this.prisma.communityChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) throw new NotFoundException('Défi introuvable');

    const existing = await this.prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId, userId } },
    });

    if (existing) {
      await this.prisma.challengeParticipant.delete({ where: { id: existing.id } });
      const count = await this.prisma.challengeParticipant.count({ where: { challengeId } });
      return { joined: false, participants: count };
    } else {
      await this.prisma.challengeParticipant.create({ data: { challengeId, userId } });
      const count = await this.prisma.challengeParticipant.count({ where: { challengeId } });
      return { joined: true, participants: count };
    }
  }
}
