import { Controller,Body,Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getUnreadNotifications(@Request() req) {
    return this.notificationService.getUnreadNotifications(req.user.id);
  }

  @Post(':id/read')
  markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationService.markAsRead(id, req.user.id);
  }
  @Post('/comment')
  createCommentNotify(@Body() body: {
    receiverId: string;
    senderId: string;
    commentId: string;
  }) {
    return this.notificationService.createCommentNotification(body);
  }
}