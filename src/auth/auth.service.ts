import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';

import { UsersService } from '../user/users.service';
import type { UserDocument } from '../user/user.schema';

import type { JwtPayload, RequestUser } from './auth.dto';
import type { RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.usersService.findOneByEmailWithPassword(email);
    if (!user) return null;

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return null;

    return user;
  }

  /**
   * Register a new user (validates, hashes password via schema, checks uniqueness)
   */
  async register(registerDto: RegisterDto): Promise<UserDocument> {
    return await this.usersService.create(registerDto);
  }

  /**
   * Validate JWT payload and return user identity for request.
   */
  validatePayload(payload: JwtPayload): RequestUser {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }

  /**
   * Generates JWT access token for the user (returned in response body; client sends as Bearer).
   */
  createAccessToken(user: UserDocument): string {
    const _id =
      typeof user._id === 'string' ? new Types.ObjectId(user._id) : user._id;

    return this.jwtService.sign({
      sub: _id.toString(),
      email: user.email,
    });
  }
}
