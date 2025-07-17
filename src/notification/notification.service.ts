import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationGateway } from './websocket.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway
  ) {}

  // 🔔 Generic notification creator
  async createNotification(data: {
    userId: string;           // Receiver
    senderId: string;         // Creator
    type: 'reply'  | 'comment';
    commentId: string;
  }) {
    // Get sender details
    const sender = await this.prisma.user.findUnique({
      where: { id: data.senderId },
      select: { username: true },
    });

    if (!sender) throw new NotFoundException('Sender not found');

    // Build message
    let message = '';
    switch (data.type) {
      case 'reply':
        message = `${sender.username} replied to your comment.`;
        break;
      case 'comment':
        message = `${sender.username} commented on your post.`;
        break;
    }

    // Create notification
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        message,
        commentId: data.commentId,
      },
      include: {
        user: true,
      },
    });

    // Emit via WebSocket
    this.notificationGateway.sendNotificationToUser(data.userId, notification);

    return notification;
  }

  // 🔔 On new top-level comment or thread notification
  async createCommentNotification({
    receiverId,
    senderId,
    commentId,
  }: {
    receiverId: string;
    senderId: string;
    commentId: string;
  }) {
    return this.createNotification({
      userId: receiverId,
      senderId,
      type: 'comment',
      commentId,
    });
  }

  // Get unread notifications
  async getUnreadNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
      },
    });
  }

  // Mark single notification as read
  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: {
        id,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }
}
