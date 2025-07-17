import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Comment, User } from '@prisma/client';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { NotificationService } from 'src/notification/notification.service';

type CommentWithAuthor = Comment & { author: User };
type CommentWithReplies = CommentWithAuthor & { replies: CommentWithReplies[] };

@Injectable()
export class CommentService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService
  ) {}

  private transformComment(comment: CommentWithAuthor, userId: string) {
    const canEdit = comment.authorId === userId && !comment.isDeleted;
    const canDelete = comment.authorId === userId && !comment.isDeleted;
    const canRestore =
      comment.authorId === userId &&
      comment.isDeleted &&
      comment.deletedAt &&
      comment.deletedAt.getTime() > Date.now() - 15 * 60 * 1000;

    return {
      ...comment,
      canEdit,
      canDelete,
      canRestore,
    };
  }

  async create(createCommentDto: CreateCommentDto, userId: string) {
    let parentComment: Comment | null = null;

    if (createCommentDto.parent_id) {
      parentComment = await this.prisma.comment.findUnique({
        where: { id: createCommentDto.parent_id },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const commentData = {
      content: createCommentDto.content,
      authorId: userId,
      parentId: createCommentDto.parent_id || null,
      rootId: parentComment ? parentComment.rootId || parentComment.id : null,
      depth: parentComment ? parentComment.depth + 1 : 0,
    };

    const savedComment = await this.prisma.comment.create({
      data: commentData,
      include: { author: true },
    });
    const path = parentComment?.path
      ? `${parentComment.path}.${savedComment.id}`
      : parentComment
      ? `${parentComment.id}.${savedComment.id}`
      : savedComment.id;

    const updated = await this.prisma.comment.update({
      where: { id: savedComment.id },
      data: { path },
      include: { author: true },
    });

    if( parentComment && parentComment.authorId !== userId){
      await this.notificationService.createNotification({
        userId:parentComment.authorId,
        senderId:userId,
        type:'reply',
        commentId:parentComment.id,
      })
    }
    if (!parentComment && commentData.rootId) {
      // Find the original comment in the thread (root comment)
      const rootThread = await this.prisma.comment.findFirst({
        where: {
          id: commentData.rootId,
        },
      });

      if (rootThread && rootThread.authorId !== userId) {
        await this.notificationService.createNotification({
          userId: rootThread.authorId,
          senderId: userId,
          type: 'comment',
          commentId: updated.id,
        });
      }
    }
  }

  async findAll(page = 1, limit = 20, userId?: string) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          parentId: null,
          OR: [
            { isDeleted: false },
            {
              isDeleted: true,
              authorId: userId,
              deletedAt: {
                gte: new Date(Date.now() - 15 * 60 * 1000),
              },
            },
          ],
        },
        include: {
          author: true,
          _count: {
            select: {
              replies: {
                where: {
                  isDeleted: false,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),

      this.prisma.comment.count({
        where: {
          parentId: null,
          OR: [
            { isDeleted: false },
            {
              isDeleted: true,
              authorId: userId,
              deletedAt: {
                gte: new Date(Date.now() - 15 * 60 * 1000),
              },
            },
          ],
        },
      }),
    ]);

    return {
      comments: comments.map((c) => this.transformComment(c, userId)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findCommentTree(rootId: string, page = 1, limit = 50, userId?: string) {
    const skip = (page - 1) * limit;

    const comments = await this.prisma.comment.findMany({
     where: {
        AND: [
          {
            OR: [
              { id: rootId },
              { rootId },
            ],
          },
          {
            OR: [
              { isDeleted: false },
              {
                isDeleted: true,
                authorId: userId,
                deletedAt: {
                  gte: new Date(Date.now() - 15 * 60 * 1000),
                },
              },
            ],
          },
        ],
      },
      include: {
        author: true,
        _count: {
          select: {
            replies: {
              where: {
                isDeleted: false,
              },
            },
          },
        },
      },
      orderBy: { path: 'asc' },
      skip,
      take: limit,
    });

    const transformed = comments.map((c) => ({
      ...c,
      ...this.transformComment(c, userId),
      replies: [],
    }));

    return this.buildCommentTree(transformed);
  }

  private buildCommentTree(comments: CommentWithReplies[]): CommentWithReplies[] {
    const map = new Map<string, CommentWithReplies>();
    const roots: CommentWithReplies[] = [];

    comments.forEach((c) => map.set(c.id, { ...c, replies: [] }));
    comments.forEach((c) => {
      const entry = map.get(c.id)!;
      if (c.parentId) {
        const parent = map.get(c.parentId);
        if (parent) parent.replies.push(entry);
      } else {
        roots.push(entry);
      }
    });

    return roots;
  }

  async update(id: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Unauthorized');
    if (comment.isDeleted) throw new ForbiddenException('Cannot edit deleted comment');

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (comment.createdAt < fifteenMinutesAgo) {
      throw new ForbiddenException('Edit window expired');
    }

    const updated = await this.prisma.comment.update({
      where: { id },
      data: {
        content: dto.content,
        isEdited: true,
        updatedAt: new Date(),
      },
      include: { author: true },
    });

    return this.transformComment(updated, userId);
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Unauthorized');
    if (comment.isDeleted) throw new ForbiddenException('Already deleted');

    await this.prisma.comment.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return { message: 'Comment deleted. You can restore it within 15 minutes.' };
  }

  async restore(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenException('Unauthorized');
    if (!comment.isDeleted) throw new ForbiddenException('Not deleted');

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (comment.deletedAt && comment.deletedAt < fifteenMinutesAgo) {
      throw new ForbiddenException('Restore window expired');
    }

    const restored = await this.prisma.comment.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
      include: { author: true },
    });

    return this.transformComment(restored, userId);
  }

  async findUserComments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          authorId: userId,
          parentId: null,
          OR: [
            { isDeleted: false },
            {
              isDeleted: true,
              deletedAt: {
                gte: new Date(Date.now() - 15 * 60 * 1000),
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          author: true,
          _count: {
            select: {
              replies: {
                where: {
                  isDeleted: false,
                },
              },
            },
          },
        },
      }),
      this.prisma.comment.count({
        where: {
          authorId: userId,
          parentId: null,
          OR: [
            { isDeleted: false },
            {
              isDeleted: true,
              deletedAt: {
                gte: new Date(Date.now() - 15 * 60 * 1000),
              },
            },
          ],
        },
      }),
    ]);

    return {
      comments: comments.map((c) => this.transformComment(c, userId)),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async findById(id: string, userId?: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!comment) throw new NotFoundException('Comment not found');
    return this.transformComment(comment, userId);
  }
}
