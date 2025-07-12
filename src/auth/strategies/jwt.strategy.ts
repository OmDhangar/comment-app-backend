import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to extract from cookie
        (request: Request) => {
          return request?.cookies?.access_token;
        },
        // Fallback to Authorization header for API compatibility
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: any) {
    // Optionally verify user still exists in database
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      return null;
    }
    
    return { 
      id: payload.sub, 
      email: payload.email,
      username: user.username 
    };
  }
}
