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
    findAllWithSummary: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    toggleExcluded: jest.Mock;
    remove: jest.Mock;
    getSummary: jest.Mock;
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
      findAllWithSummary: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      toggleExcluded: jest.fn(),
      remove: jest.fn(),
      getSummary: jest.fn(),
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
    it('should create an account and return account with summary', async () => {
      const mockSummary = {
        total_raw: 100050,
        scale: 2,
        total: 1000.5,
        currency: {
          id: 'cur1',
          code: 'USD',
          name: 'US Dollar',
          decimal_digits: 2,
        },
      };
      service.create.mockResolvedValue(mockAccount);
      service.toAccountDto.mockReturnValue(mockAccountDto);
      service.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.create(mockUser, mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(
        mockUser.userId,
        mockCreateDto,
      );
      expect(service.toAccountDto).toHaveBeenCalledWith(mockAccount);
      expect(service.getSummary).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual({
        account: mockAccountDto,
        summary: mockSummary,
      });
    });
  });

  describe('findAll', () => {
    it('should return list and summary for the user', async () => {
      const mockSummary = {
        total_raw: 100050,
        scale: 2,
        total: 1000.5,
        currency: {
          id: 'cur1',
          code: 'USD',
          name: 'US Dollar',
          decimal_digits: 2,
        },
      };
      const mockResponse = {
        list: [mockAccountDto],
        summary: mockSummary,
      };
      service.findAllWithSummary.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockUser);

      expect(service.findAllWithSummary).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual(mockResponse);
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
    it('should update an account and return account with summary', async () => {
      const updateDto: UpdateAccountDto = { name: 'Updated Name' };
      const updated = { ...mockAccount, name: 'Updated Name' };
      const updatedDto = { ...mockAccountDto, name: 'Updated Name' };
      const mockSummary = {
        total_raw: 100050,
        scale: 2,
        total: 1000.5,
        currency: {
          id: 'cur1',
          code: 'USD',
          name: 'US Dollar',
          decimal_digits: 2,
        },
      };
      service.update.mockResolvedValue(updated);
      service.toAccountDto.mockReturnValue(updatedDto);
      service.getSummary.mockResolvedValue(mockSummary);

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
      expect(service.getSummary).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual({
        account: updatedDto,
        summary: mockSummary,
      });
    });
  });

  describe('toggleExcluded', () => {
    it('should toggle excluded and return account with summary', async () => {
      const toggled = { ...mockAccount, excluded: true };
      const toggledDto = { ...mockAccountDto, excluded: true };
      const mockSummary = {
        total_raw: 0,
        scale: 2,
        total: 0,
        currency: {
          id: 'cur1',
          code: 'USD',
          name: 'US Dollar',
          decimal_digits: 2,
        },
      };
      service.toggleExcluded.mockResolvedValue(toggled);
      service.toAccountDto.mockReturnValue(toggledDto);
      service.getSummary.mockResolvedValue(mockSummary);

      const result = await controller.toggleExcluded(mockUser, mockAccount._id);

      expect(service.toggleExcluded).toHaveBeenCalledWith(
        mockUser.userId,
        mockAccount._id,
      );
      expect(service.toAccountDto).toHaveBeenCalledWith(toggled);
      expect(service.getSummary).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual({
        account: toggledDto,
        summary: mockSummary,
      });
    });
  });

  describe('remove', () => {
    it('should remove an account and return new total summary', async () => {
      const mockSummary = {
        total_raw: 50000,
        scale: 2,
        total: 500.0,
        currency: {
          id: 'cur1',
          code: 'USD',
          name: 'US Dollar',
          decimal_digits: 2,
        },
      };
      service.remove.mockResolvedValue(mockSummary);

      const result = await controller.remove(mockUser, mockAccount._id);

      expect(service.remove).toHaveBeenCalledWith(
        mockUser.userId,
        mockAccount._id,
      );
      expect(result).toEqual(mockSummary);
    });
  });
});
