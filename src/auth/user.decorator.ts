import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { RequestUser } from './auth.dto';

/**
 * Extracts the authenticated user from the request (set by JwtStrategy).
 */
export const UserDecorator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
