import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Global JWT guard: protects all routes by default.
 * Routes decorated with @Public() skip JWT validation (e.g. auth/register, auth/login).
 */
@Injectable()
export class JwtAuthGlobalGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    _info: Error | null,
  ): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Unauthorized');
    }
    return user;
  }
}
