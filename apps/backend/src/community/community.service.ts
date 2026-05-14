import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

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
    const [posts, total] = await this.prisma.$transaction([
      this.prisma.communityPost.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          likes: { where: { userId }, select: { id: true } },
        },
      }),
      this.prisma.communityPost.count(),
    ]);

    return {
      posts: posts.map((p) => ({
        id: p.id,
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
