// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CommentModule } from './comment/comment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    CommentModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}