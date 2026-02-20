import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import type { JwtPayload, RequestUser } from './auth.dto';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: { validatePayload: jest.Mock };

  const mockPayload: JwtPayload = {
    sub: '507f1f77bcf86cd799439011',
    email: 'john@example.com',
  };

  const mockRequestUser: RequestUser = {
    userId: mockPayload.sub,
    email: mockPayload.email,
  };

  beforeEach(async () => {
    authService = {
      validatePayload: jest.fn().mockReturnValue(mockRequestUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'JWT_SECRET' ? 'secret' : undefined,
            ),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return RequestUser from authService.validatePayload', () => {
      const result = strategy.validate(mockPayload);

      expect(authService.validatePayload).toHaveBeenCalledWith(mockPayload);
      expect(result).toEqual(mockRequestUser);
    });
  });
});
