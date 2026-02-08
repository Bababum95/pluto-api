import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that protects routes with JWT token from Authorization Bearer header.
 */
export class JwtAuthGuard extends AuthGuard('jwt') {}
