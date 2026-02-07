import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { Model } from 'mongoose';

import { User } from './user.schema';
import { UsersService } from './users.service';
import type { CreateUserDto, UpdateUserDto } from './users.dto';

const mockI18nService = {
  t: (key: string): string => {
    const messages: Record<string, string> = {
      'user.errors.emailAlreadyExists': 'User with this email already exists',
      'user.create.failed': 'User creation failed',
      'user.errors.notFound': 'User not found',
    };
    return messages[key] ?? key;
  },
};

const createChain = (resolvedValue: unknown) => ({
  exec: jest.fn().mockResolvedValue(resolvedValue),
  lean: jest.fn().mockReturnThis(),
});

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: Model<unknown> & {
    findOne: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };
  let saveMock: jest.Mock;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john@example.com',
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    saveMock = jest.fn().mockResolvedValue(undefined);
    const MockModel = function (this: unknown, dto?: CreateUserDto) {
      const instance = {
        _id: mockUser._id,
        ...dto,
        save: saveMock,
      };
      if (new.target) {
        Object.assign(this ?? {}, instance);
        return this;
      }
      return instance;
    } as unknown as Model<unknown> & {
      findOne: jest.Mock;
      find: jest.Mock;
      findById: jest.Mock;
      findByIdAndUpdate: jest.Mock;
      findByIdAndDelete: jest.Mock;
    };

    const chainNull = createChain(null);

    MockModel.findOne = jest.fn().mockReturnValue(chainNull);
    MockModel.find = jest.fn().mockReturnValue(createChain([]));
    MockModel.findById = jest.fn().mockReturnValue(chainNull);
    MockModel.findByIdAndUpdate = jest.fn().mockReturnValue(chainNull);
    MockModel.findByIdAndDelete = jest.fn().mockReturnValue(chainNull);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: MockModel,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    mockUserModel = module.get(getModelToken(User.name));
    jest.clearAllMocks();

    // Restore chainable return values after clearAllMocks
    MockModel.findOne.mockReturnValue(createChain(null));
    MockModel.find.mockReturnValue(createChain([]));
    MockModel.findById.mockReturnValue(createChain(null));
    MockModel.findByIdAndUpdate.mockReturnValue(createChain(null));
    MockModel.findByIdAndDelete.mockReturnValue(createChain(null));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user and return it without password', async () => {
      const createDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
      };
      mockUserModel.findById.mockReturnValue(createChain(mockUser));

      const result = await service.create(createDto);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'john@example.com',
      });
      expect(saveMock).toHaveBeenCalled();
      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUser._id);
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException when email already exists', async () => {
      const createDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
      };
      mockUserModel.findOne.mockReturnValue(createChain(mockUser));

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'User with this email already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const list = [mockUser];
      mockUserModel.find.mockReturnValue(createChain(list));

      const result = await service.findAll();

      expect(mockUserModel.find).toHaveBeenCalledWith();
      expect(result).toEqual(list);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUserModel.findById.mockReturnValue(createChain(mockUser));

      const result = await service.findOne(mockUser._id);

      expect(mockUserModel.findById).toHaveBeenCalledWith(mockUser._id);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserModel.findById.mockReturnValue(createChain(null));

      const result = await service.findOne('invalid');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockUserModel.findOne.mockReturnValue(createChain(mockUser));

      const result = await service.findByEmail('john@example.com');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'john@example.com',
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserModel.findOne.mockReturnValue(createChain(null));

      const result = await service.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });

    it('should normalize email to lowercase', async () => {
      mockUserModel.findOne.mockReturnValue(createChain(null));

      await service.findByEmail('John@Example.COM');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'john@example.com',
      });
    });
  });

  describe('update', () => {
    it('should update a user and return it', async () => {
      const updateDto: UpdateUserDto = { name: 'Jane Doe' };
      const updated = { ...mockUser, name: 'Jane Doe' };
      mockUserModel.findByIdAndUpdate.mockReturnValue(createChain(updated));

      const result = await service.update(mockUser._id, updateDto);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        updateDto,
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(createChain(null));

      await expect(service.update('invalid', { name: 'Jane' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when new email already exists', async () => {
      const updateDto: UpdateUserDto = { email: 'other@example.com' };
      mockUserModel.findOne.mockReturnValue(
        createChain({ _id: 'other-id', email: 'other@example.com' }),
      );

      await expect(service.update(mockUser._id, updateDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.update(mockUser._id, updateDto)).rejects.toThrow(
        'User with this email already exists',
      );
    });
  });

  describe('remove', () => {
    it('should remove a user and return true', async () => {
      mockUserModel.findByIdAndDelete.mockReturnValue(createChain(mockUser));

      const result = await service.remove(mockUser._id);

      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith(
        mockUser._id,
      );
      expect(result).toBe(true);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserModel.findByIdAndDelete.mockReturnValue(createChain(null));

      await expect(service.remove('invalid')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove('invalid')).rejects.toThrow('User not found');
    });
  });
});
