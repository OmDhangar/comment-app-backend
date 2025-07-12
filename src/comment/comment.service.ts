// src/comments/comments.service.ts
import { Injectable, NotFoundException,ParseUUIDPipe  ,ForbiddenException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Comment, User } from '@prisma/client';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

type CommentWithAuthor = Comment & { author: User };
type CommentWithReplies = CommentWithAuthor & { replies: CommentWithReplies[] };

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async create(createCommentDto: CreateCommentDto, userId: string): Promise<CommentWithAuthor> {
    let parentComment = null;
    
    // Handle nested comments
    if (createCommentDto.parent_id) {
      parentComment = await this.prisma.comment.findUnique({
        where: { id: createCommentDto.parent_id },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const commentData: any = {
      content: createCommentDto.content,
      authorId: userId,
      parentId: createCommentDto.parent_id || null,
      rootId: parentComment ? (parentComment.rootId || parentComment.id) : null,
      depth: parentComment ? parentComment.depth + 1 : 0,
    };

    const savedComment = await this.prisma.comment.create({
      data: commentData,
      include: {
        author: true,
      },
    });

    // Build materialized path and update if necessary
    let path = savedComment.id;
    if (parentComment) {
      path = parentComment.path ? `${parentComment.path}.${savedComment.id}` : `${parentComment.id}.${savedComment.id}`;
    }

    return this.prisma.comment.update({
      where: { id: savedComment.id },
      data: { path },
      include: {
        author: true,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    
    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { 
          isDeleted: false, 
          parentId: null 
        },
        include: { 
          author: true,
          _count: {
            select: { replies: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.comment.count({
        where: { 
          isDeleted: false, 
          parentId: null 
        },
      }),
    ]);

    return {
      comments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findCommentTree(rootId: string, page: number = 1, limit: number = 50): Promise<CommentWithReplies[]> {
    const skip = (page - 1) * limit;
    
    const comments = await this.prisma.comment.findMany({
      where: { 
        OR: [
          { id: rootId },
          { rootId: rootId }
        ],
        isDeleted: false 
      },
      include: { 
        author: true,
        _count: {
          select: { replies: true }
        }
      },
      orderBy: { path: 'asc' },
      skip,
      take: limit,
    });

    return this.buildCommentTree(comments);
  }

  private buildCommentTree(comments: CommentWithAuthor[]): CommentWithReplies[] {
    const commentMap = new Map<string, CommentWithReplies>();
    const rootComments: CommentWithReplies[] = [];

    // First pass: create map of all comments with replies array
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;
      
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  }

  async update(id: string, updateCommentDto: UpdateCommentDto, userId: string): Promise<CommentWithAuthor> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    if (comment.isDeleted) {
      throw new ForbiddenException('Cannot edit deleted comment');
    }

    // Check 15-minute edit window
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (comment.createdAt < fifteenMinutesAgo) {
      throw new ForbiddenException('Comment can only be edited within 15 minutes of posting');
    }

    return this.prisma.comment.update({
      where: { id },
      data: {
        content: updateCommentDto.content,
        isEdited: true,
        updatedAt: new Date(),
      },
      include: {
        author: true,
      },
    });
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    if (comment.isDeleted) {
      throw new ForbiddenException('Comment is already deleted');
    }

    await this.prisma.comment.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return { message: 'Comment deleted successfully. You can restore it within 15 minutes.' };
  }

  async restore(id: string, userId: string): Promise<CommentWithAuthor> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only restore your own comments');
    }

    if (!comment.isDeleted) {
      throw new ForbiddenException('Comment is not deleted');
    }

    // Check 15-minute restore window
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (comment.deletedAt && comment.deletedAt < fifteenMinutesAgo) {
      throw new ForbiddenException('Comment can only be restored within 15 minutes of deletion');
    }

    return this.prisma.comment.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
      include: {
        author: true,
      },
    });
  }

  async findById(id: string): Promise<CommentWithAuthor> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }
}