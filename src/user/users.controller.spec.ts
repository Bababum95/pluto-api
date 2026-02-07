import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import type { CreateUserDto, UpdateUserDto, UserDto } from './users.dto';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

jest.mock('./users.service', () => ({
  UsersService: jest.fn(),
}));

type MockedUser = {
  _id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const mockI18n = {
  t: (key: string): string => {
    const messages: Record<string, string> = {
      'user.errors.notFound': 'User not found',
      'user.remove.success': 'User has been successfully deleted',
    };
    return messages[key] ?? key;
  },
};

function toUserDto(user: MockedUser): UserDto {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

describe('UsersController', () => {
  let controller: UsersController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    findByEmail: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    toUserDto: jest.Mock;
  };

  const mockUser: MockedUser = {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john@example.com',
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateDto: CreateUserDto = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'secret123',
  };

  beforeEach(async () => {
    const mockUsersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toUserDto: jest.fn((user: MockedUser) => toUserDto(user)),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and return it', async () => {
      service.create.mockResolvedValue(mockUser);
      const result = await controller.create(mockCreateDto);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should return an array of users as UserDto', async () => {
      const list = [mockUser];
      service.findAll.mockResolvedValue(list);
      service.toUserDto.mockImplementation((user: MockedUser) =>
        toUserDto(user),
      );
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([toUserDto(mockUser)]);
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email as UserDto', async () => {
      service.findByEmail.mockResolvedValue(mockUser);
      service.toUserDto.mockImplementation((user: MockedUser) =>
        toUserDto(user),
      );
      const result = await controller.findByEmail(
        'john@example.com',
        mockI18n as never,
      );
      expect(service.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(service.findByEmail).toHaveBeenCalledTimes(1);
      expect(result).toEqual(toUserDto(mockUser));
    });

    it('should throw NotFoundException when user not found', async () => {
      service.findByEmail.mockResolvedValue(null);
      await expect(
        controller.findByEmail('missing@example.com', mockI18n as never),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.findByEmail('missing@example.com', mockI18n as never),
      ).rejects.toThrow('User not found');
    });
  });

  describe('findOne', () => {
    it('should return a user by id as UserDto', async () => {
      service.findOne.mockResolvedValue(mockUser);
      service.toUserDto.mockImplementation((user: MockedUser) =>
        toUserDto(user),
      );
      const result = await controller.findOne(mockUser._id, mockI18n as never);
      expect(service.findOne).toHaveBeenCalledWith(mockUser._id);
      expect(service.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(toUserDto(mockUser));
    });

    it('should throw NotFoundException when user not found', async () => {
      service.findOne.mockResolvedValue(null);
      await expect(
        controller.findOne('invalid', mockI18n as never),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.findOne('invalid', mockI18n as never),
      ).rejects.toThrow('User not found');
    });
  });

  describe('update', () => {
    it('should update a user and return it as UserDto', async () => {
      const updateDto: UpdateUserDto = { name: 'Jane Doe' };
      const updated = { ...mockUser, name: 'Jane Doe' };
      service.update.mockResolvedValue(updated);
      service.toUserDto.mockImplementation((user: MockedUser) =>
        toUserDto(user),
      );
      const result = await controller.update(mockUser._id, updateDto);
      expect(service.update).toHaveBeenCalledWith(mockUser._id, updateDto);
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual(toUserDto(updated));
    });

    it('should throw when user not found', async () => {
      service.update.mockRejectedValue(new NotFoundException('User not found'));
      await expect(
        controller.update('invalid', { name: 'Jane' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a user and return success message', async () => {
      service.remove.mockResolvedValue(true);
      const result = await controller.remove(mockUser._id, mockI18n as never);
      expect(service.remove).toHaveBeenCalledWith(mockUser._id);
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        message: 'User has been successfully deleted',
      });
    });

    it('should throw when user not found', async () => {
      service.remove.mockRejectedValue(new NotFoundException('User not found'));
      await expect(
        controller.remove('invalid', mockI18n as never),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
