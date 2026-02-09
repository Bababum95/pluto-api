import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import type { CreateAccountDto, UpdateAccountDto } from './account.dto';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import type { RequestUser } from '../auth/auth.dto';

jest.mock('./account.service', () => ({
  AccountService: jest.fn(),
}));

type MockedAccount = {
  _id: string;
  user: string;
  color: string;
  icon: string;
  name: string;
  balance: number; // Stored in minor units
  scale: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

describe('AccountController', () => {
  let controller: AccountController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    toAccountDto: jest.Mock;
  };

  const mockUser: RequestUser = {
    userId: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
  };

  const mockAccount: MockedAccount = {
    _id: '507f1f77bcf86cd799439012',
    user: mockUser.userId,
    color: '#FF5733',
    icon: 'wallet',
    name: 'Main Wallet',
    balance: 100050, // Stored in minor units (1000.50 USD with scale 2)
    scale: 2,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAccountDto = {
    id: mockAccount._id,
    color: mockAccount.color,
    icon: mockAccount.icon,
    name: mockAccount.name,
    balance: 1000.5, // Converted from minor units for API response
    scale: mockAccount.scale,
    currency: mockAccount.currency,
    createdAt: mockAccount.createdAt.toISOString(),
    updatedAt: mockAccount.updatedAt.toISOString(),
  };

  const mockCreateDto: CreateAccountDto = {
    color: '#FF5733',
    icon: 'wallet',
    name: 'Main Wallet',
    balance: 1000.5,
    scale: 2,
    currency: 'USD',
  };

  beforeEach(async () => {
    const mockAccountService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toAccountDto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [{ provide: AccountService, useValue: mockAccountService }],
    }).compile();

    controller = module.get<AccountController>(AccountController);
    service = module.get(AccountService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an account and return AccountDto', async () => {
      service.create.mockResolvedValue(mockAccount);
      service.toAccountDto.mockReturnValue(mockAccountDto);

      const result = await controller.create(mockUser, mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(
        mockUser.userId,
        mockCreateDto,
      );
      expect(service.toAccountDto).toHaveBeenCalledWith(mockAccount);
      expect(result).toEqual(mockAccountDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of AccountDto for the user', async () => {
      const list = [mockAccount];
      service.findAll.mockResolvedValue(list);
      service.toAccountDto.mockReturnValue(mockAccountDto);

      const result = await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.userId);
      expect(service.toAccountDto).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockAccountDto]);
    });
  });

  describe('findOne', () => {
    it('should return an AccountDto by id', async () => {
      service.findOne.mockResolvedValue(mockAccount);
      service.toAccountDto.mockReturnValue(mockAccountDto);

      const result = await controller.findOne(mockUser, mockAccount._id);

      expect(service.findOne).toHaveBeenCalledWith(
        mockUser.userId,
        mockAccount._id,
      );
      expect(service.toAccountDto).toHaveBeenCalledWith(mockAccount);
      expect(result).toEqual(mockAccountDto);
    });

    it('should throw NotFoundException when account not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne(mockUser, 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an account and return AccountDto', async () => {
      const updateDto: UpdateAccountDto = { name: 'Updated Name' };
      const updated = { ...mockAccount, name: 'Updated Name' };
      const updatedDto = { ...mockAccountDto, name: 'Updated Name' };
      service.update.mockResolvedValue(updated);
      service.toAccountDto.mockReturnValue(updatedDto);

      const result = await controller.update(
        mockUser,
        mockAccount._id,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockUser.userId,
        mockAccount._id,
        updateDto,
      );
      expect(service.toAccountDto).toHaveBeenCalledWith(updated);
      expect(result).toEqual(updatedDto);
    });
  });

  describe('remove', () => {
    it('should remove an account and return void', async () => {
      service.remove.mockResolvedValue(true);

      await controller.remove(mockUser, mockAccount._id);

      expect(service.remove).toHaveBeenCalledWith(
        mockUser.userId,
        mockAccount._id,
      );
    });
  });
});
