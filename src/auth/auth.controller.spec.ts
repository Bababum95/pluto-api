import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../user/users.service';
import type { RequestUser } from './auth.dto';
import type { LoginDto, RegisterDto } from './auth.dto';
import type { UserDto } from '../user/users.dto';

jest.mock('./auth.service', () => ({
  AuthService: jest.fn(),
}));

const mockUserDto: UserDto = {
  id: '507f1f77bcf86cd799439011',
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    validateUser: jest.Mock;
    createAccessToken: jest.Mock;
  };
  let usersService: {
    toUserDto: jest.Mock;
    findOne: jest.Mock;
  };

  const mockI18n = {
    t: (key: string): string => {
      const messages: Record<string, string> = {
        'auth.login.errors.invalidCredentials': 'Invalid credentials.',
        'auth.logout.success': 'Logged out successfully.',
      };
      return messages[key] ?? key;
    },
  };

  const mockUser: RequestUser = {
    userId: '507f1f77bcf86cd799439011',
    email: 'john@example.com',
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      validateUser: jest.fn(),
      createAccessToken: jest.fn().mockReturnValue('mock-access-token'),
    };
    usersService = {
      toUserDto: jest.fn().mockReturnValue(mockUserDto),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register user and return user with accessToken', async () => {
      const registerDto: RegisterDto = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'secret123',
      };
      const createdUser = {
        _id: mockUser.userId,
        name: registerDto.name,
        email: registerDto.email,
      };
      authService.register.mockResolvedValue(createdUser);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(authService.createAccessToken).toHaveBeenCalledWith(createdUser);
      expect(usersService.toUserDto).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual({
        user: mockUserDto,
        accessToken: 'mock-access-token',
      });
    });
  });

  describe('login', () => {
    it('should return user and accessToken on valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'john@example.com',
        password: 'secret123',
      };
      const user = {
        _id: mockUser.userId,
        email: loginDto.email,
        name: 'John Doe',
      };
      authService.validateUser.mockResolvedValue(user);

      const result = await controller.login(loginDto, mockI18n as never);

      expect(authService.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(authService.createAccessToken).toHaveBeenCalledWith(user);
      expect(usersService.toUserDto).toHaveBeenCalledWith(user);
      expect(result).toEqual({
        user: mockUserDto,
        accessToken: 'mock-access-token',
      });
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'john@example.com',
        password: 'wrong',
      };
      authService.validateUser.mockResolvedValue(null);

      await expect(
        controller.login(loginDto, mockI18n as never),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.login(loginDto, mockI18n as never),
      ).rejects.toThrow('Invalid credentials.');
      expect(authService.createAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should return success message', () => {
      const result = controller.logout(mockI18n as never);

      expect(result).toEqual({ message: 'Logged out successfully.' });
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const fullUser = {
        _id: mockUser.userId,
        email: mockUser.email,
        name: 'John Doe',
      };
      usersService.findOne.mockResolvedValue(fullUser);

      const result = await controller.getProfile(mockUser);

      expect(usersService.findOne).toHaveBeenCalledWith(mockUser.userId);
      expect(usersService.toUserDto).toHaveBeenCalledWith(fullUser);
      expect(result).toEqual(mockUserDto);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(controller.getProfile(mockUser)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
