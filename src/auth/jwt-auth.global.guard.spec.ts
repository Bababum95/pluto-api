import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGlobalGuard } from './jwt-auth.global.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

/** Avoid pulling in passport middleware when instantiating AuthGuard('jwt') */
jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class MockAuthGuard {
      canActivate(): Promise<boolean> {
        return Promise.resolve(true);
      }
    },
}));

describe('JwtAuthGlobalGuard', () => {
  let guard: JwtAuthGlobalGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const createMockContext = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn(),
        getResponse: jest.fn(),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGlobalGuard,
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<JwtAuthGlobalGuard>(JwtAuthGlobalGuard);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should check handler and class for IS_PUBLIC_KEY and delegate to parent when not public', async () => {
      const context = createMockContext();
      reflector.getAllAndOverride.mockReturnValue(false);

      const canActivateResult = guard.canActivate(context);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      await expect(Promise.resolve(canActivateResult)).resolves.toBe(true);
    });

    it('should return true when route is public', () => {
      const context = createMockContext();
      reflector.getAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('handleRequest', () => {
    it('should return user when no error and user present', () => {
      const user = { userId: '1', email: 'a@b.com' };

      const result = guard.handleRequest(null, user, null);

      expect(result).toBe(user);
    });

    it('should throw UnauthorizedException when user is missing', () => {
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        'Unauthorized',
      );
    });

    it('should throw the original error when err is provided', () => {
      const err = new Error('JWT expired');

      expect(() => guard.handleRequest(err, null, null)).toThrow(err);
    });
  });
});
