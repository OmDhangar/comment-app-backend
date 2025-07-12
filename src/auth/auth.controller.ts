import { Controller, Post, Body, Res, Get, UseGuards, Request } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(registerDto);
    
    // Set HTTP-only cookie
    res.cookie('access_token', result.access_token, {
      ...this.authService.getCookieOptions(),
      sameSite: 'lax', // or 'strict' or 'none' as appropriate
    });
    
    // Return user data (without token for security)
    return {
      user: result.user,
      message: 'Registration successful',
    };
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(loginDto);
    
    // Set HTTP-only cookie
    res.cookie('access_token', result.access_token,{
      ...this.authService.getCookieOptions(),
      sameSite: 'lax', // or 'strict' or 'none' as appropriate
    });
    
    // Return user data (without token for security)
    return {
      user: result.user,
      message: 'Login successful',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear the cookie
    res.clearCookie('access_token', {
      httpOnly: true,
      path: '/',
    });
    
    return { message: 'Logout successful' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return {
      user: req.user,
    };
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  async checkAuth(@Request() req) {
    return {
      authenticated: true,
      user: req.user,
    };
  }
}