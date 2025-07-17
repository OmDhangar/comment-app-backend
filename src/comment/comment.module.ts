// src/comments/comments.module.ts
import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentsController } from './comment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CommentCleanupService } from './cleanup/commentCleanup.service';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [PrismaModule,NotificationModule],
  controllers: [CommentsController],
  providers: [CommentService,CommentCleanupService],
  exports: [CommentService],
})
export class CommentModule {}