// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UsersController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}