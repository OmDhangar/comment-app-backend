// src/users/users.controller.ts
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UserService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}