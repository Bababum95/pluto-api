import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { LocalStrategy } from './local.strategy';
import { AuthService } from './auth.service';
import type { User } from '../user/user.schema';

const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  name: 'John Doe',
  email: 'john@example.com',
} as unknown as User;

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: { validateUser: jest.Mock };

  const mockI18n = {
    t: (key: string): string =>
      key === 'auth.login.errors.invalidCredentials'
        ? 'Invalid credentials.'
        : key,
  };

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: authService },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      authService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate('john@example.com', 'secret123');

      expect(authService.validateUser).toHaveBeenCalledWith(
        'john@example.com',
        'secret123',
      );
      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException when user is null', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('unknown@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate('unknown@example.com', 'password'),
      ).rejects.toThrow('Invalid credentials.');
    });
  });
});
