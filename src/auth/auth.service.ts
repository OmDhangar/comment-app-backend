import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.usersService.create(
      registerDto.email,
      registerDto.username,
      registerDto.password,
    );

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  getCookieOptions() {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const expiresIn = this.configService.get('jwt.expiresIn') || '1d';
    
    // Convert expiresIn to milliseconds
    const expirationTime = this.parseExpirationTime(expiresIn);
    
    return {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: isProduction ? 'strict' : 'lax' as const,
      maxAge: expirationTime,
      path: '/',
    };
  }

  private parseExpirationTime(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default to 1 day
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
}
