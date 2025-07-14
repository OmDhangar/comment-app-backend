// comment-cleanup.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommentCleanupService {
  private readonly logger = new Logger(CommentCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCleanup() {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago
    const deleted = await this.prisma.comment.deleteMany({
      where: {
        isDeleted: true,
        deletedAt: { lt: cutoff },
      },
    });

    if (deleted.count > 0) {
      this.logger.log(`🧹 Deleted ${deleted.count} expired soft-deleted comments`);
    }
  }
}
