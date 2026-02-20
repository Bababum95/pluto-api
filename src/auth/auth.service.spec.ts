import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';

import { AuthService } from './auth.service';
import { UsersService } from '../user/users.service';
import { SettingsService } from '../settings/settings.service';
import type { UserDocument } from '../user/user.schema';
import type { RegisterDto, JwtPayload } from './auth.dto';

const mockUserDocument = {
  _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
  name: 'John Doe',
  email: 'john@example.com',
  comparePassword: jest.fn().mockResolvedValue(true),
} as unknown as UserDocument;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findOneByEmailWithPassword: jest.Mock;
    create: jest.Mock;
  };
  let settingsService: { createDefault: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findOneByEmailWithPassword: jest.fn(),
      create: jest.fn(),
    };
    settingsService = {
      createDefault: jest.fn().mockResolvedValue(undefined),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };
    configService = {
      get: jest.fn((key: string) =>
        key === 'JWT_SECRET' ? 'test-secret' : undefined,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: SettingsService, useValue: settingsService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return null when user is not found', async () => {
      usersService.findOneByEmailWithPassword.mockResolvedValue(null);

      const result = await service.validateUser(
        'unknown@example.com',
        'password123',
      );

      expect(usersService.findOneByEmailWithPassword).toHaveBeenCalledWith(
        'unknown@example.com',
      );
      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      const userWithWrongPassword = {
        ...mockUserDocument,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      usersService.findOneByEmailWithPassword.mockResolvedValue(
        userWithWrongPassword,
      );

      const result = await service.validateUser(
        'john@example.com',
        'wrongpassword',
      );

      expect(userWithWrongPassword.comparePassword).toHaveBeenCalledWith(
        'wrongpassword',
      );
      expect(result).toBeNull();
    });

    it('should return user when email and password are valid', async () => {
      usersService.findOneByEmailWithPassword.mockResolvedValue(
        mockUserDocument,
      );

      const result = await service.validateUser(
        'john@example.com',
        'correctpassword',
      );

      expect(mockUserDocument.comparePassword).toHaveBeenCalledWith(
        'correctpassword',
      );
      expect(result).toBe(mockUserDocument);
    });
  });

  describe('register', () => {
    it('should create user and default settings, then return user', async () => {
      const registerDto: RegisterDto = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'secret123',
      };
      const createdUser = {
        ...mockUserDocument,
        _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
        name: registerDto.name,
        email: registerDto.email,
      } as unknown as UserDocument;
      usersService.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith(registerDto);
      expect(settingsService.createDefault).toHaveBeenCalledWith(
        createdUser._id.toString(),
      );
      expect(result).toBe(createdUser);
    });
  });

  describe('validatePayload', () => {
    it('should return RequestUser from JWT payload', () => {
      const payload: JwtPayload = {
        sub: '507f1f77bcf86cd799439011',
        email: 'john@example.com',
      };

      const result = service.validatePayload(payload);

      expect(result).toEqual({
        userId: payload.sub,
        email: payload.email,
      });
    });
  });

  describe('createAccessToken', () => {
    it('should sign JWT with user id and email when _id is ObjectId', () => {
      const result = service.createAccessToken(mockUserDocument);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUserDocument._id.toString(),
        email: mockUserDocument.email,
      });
      expect(result).toBe('mock-jwt-token');
    });

    it('should sign JWT when user _id is string', () => {
      const userWithStringId = {
        ...mockUserDocument,
        _id: '507f1f77bcf86cd799439011' as unknown as Types.ObjectId,
      };
      jwtService.sign.mockReturnValue('another-token');

      const result = service.createAccessToken(
        userWithStringId as unknown as UserDocument,
      );

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: '507f1f77bcf86cd799439011',
        email: mockUserDocument.email,
      });
      expect(result).toBe('another-token');
    });
  });
});
