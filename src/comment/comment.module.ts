// src/comments/comments.module.ts
import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentsController } from './comment.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CommentsController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}