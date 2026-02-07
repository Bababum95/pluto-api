import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that protects routes with JWT token from HTTP-only cookie.
 */
export class JwtAuthGuard extends AuthGuard('jwt') {}
