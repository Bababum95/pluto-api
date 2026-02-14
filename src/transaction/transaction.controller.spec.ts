import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import type {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './transaction.dto';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { AccountService } from '../account/account.service';
import { SettingsService } from '../settings/settings.service';
import { RateService } from '../rate/rate.service';
import { TransactionType } from './transaction.enum';
import type { RequestUser } from '../auth/auth.dto';

jest.mock('./transaction.service', () => ({
  TransactionService: jest.fn(),
}));

type MockedTransaction = {
  _id: string;
  user: string;
  type: TransactionType;
  category: string;
  comment: string;
  account: string;
  amount: number;
  scale: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

const moneyView = (value: number, raw: number, scale: number) => ({
  value,
  raw,
  scale,
  currency: { code: 'USD', symbol: '$' },
});

describe('TransactionController', () => {
  let controller: TransactionController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    toTransactionDto: jest.Mock;
  };
  let accountService: {
    findOne: jest.Mock;
    getSummary: jest.Mock;
    toAccountDto: jest.Mock;
  };
  let _settingsService: { findByUserId: jest.Mock };
  let _rateService: { getLatestValidRate: jest.Mock };

  const mockUser: RequestUser = {
    userId: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
  };

  const mockTransaction: MockedTransaction = {
    _id: '507f1f77bcf86cd799439013',
    user: mockUser.userId,
    type: TransactionType.EXPENSE,
    category: '507f1f77bcf86cd799439012',
    comment: 'Lunch',
    account: '507f1f77bcf86cd799439014',
    amount: -150050,
    scale: 2,
    tags: ['food'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategoryDto = {
    id: mockTransaction.category.toString(),
    name: 'Food & Dining',
    color: '#FF5733',
    icon: 'wallet',
    type: 'expense',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockAccountDto = {
    id: mockTransaction.account.toString(),
    name: 'Main Wallet',
    balance: 1000.5,
    balance_raw: 100050,
    scale: 2,
    color: '#FF5733',
    icon: 'wallet',
    currency: { id: 'cur1', code: 'USD', symbol: '$' },
    order: 0,
    excluded: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTransactionDto = {
    id: mockTransaction._id,
    type: mockTransaction.type,
    category: mockCategoryDto,
    comment: mockTransaction.comment,
    account: mockAccountDto,
    amount: {
      original: moneyView(-1500.5, mockTransaction.amount, 2),
      converted: moneyView(-1500.5, mockTransaction.amount, 2),
    },
    tags: mockTransaction.tags,
    createdAt: mockTransaction.createdAt.toISOString(),
    updatedAt: mockTransaction.updatedAt.toISOString(),
  };

  const mockSummaryDto = {
    total_raw: 154327,
    total: 1543.27,
    scale: 2,
    currency: { id: 'cur1', code: 'USD', symbol: '$' },
  };

  const mockCreateDto: CreateTransactionDto = {
    type: TransactionType.EXPENSE,
    category: '507f1f77bcf86cd799439012',
    comment: 'Lunch',
    account: '507f1f77bcf86cd799439014',
    amount: -1500.5,
    scale: 2,
    tags: ['food'],
  };

  beforeEach(async () => {
    const mockTransactionService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toTransactionDto: jest.fn(),
    };

    const mockAccountService = {
      findOne: jest.fn(),
      getSummary: jest.fn(),
      toAccountDto: jest.fn(),
    };

    const mockSettingsService = {
      findByUserId: jest.fn().mockResolvedValue(null),
    };
    const mockRateService = {
      getLatestValidRate: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AccountService, useValue: mockAccountService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: RateService, useValue: mockRateService },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
    service = module.get(TransactionService);
    accountService = module.get(AccountService);
    _settingsService = module.get(SettingsService);
    _rateService = module.get(RateService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction and return transaction, account, and summary', async () => {
      const mockAccount = { _id: mockTransaction.account, balance: 100050 };
      service.create.mockResolvedValue(mockTransaction);
      service.toTransactionDto.mockReturnValue(mockTransactionDto);
      accountService.findOne.mockResolvedValue(mockAccount);
      accountService.getSummary.mockResolvedValue(mockSummaryDto);
      accountService.toAccountDto.mockReturnValue(mockAccountDto);

      const result = await controller.create(mockUser, mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(
        mockUser.userId,
        mockCreateDto,
      );
      expect(service.toTransactionDto).toHaveBeenCalledWith(mockTransaction, {
        settings: null,
        rates: [],
      });
      expect(accountService.findOne).toHaveBeenCalledWith(
        mockUser.userId,
        mockCreateDto.account,
      );
      expect(accountService.getSummary).toHaveBeenCalledWith(mockUser.userId);
      expect(accountService.toAccountDto).toHaveBeenCalledWith(mockAccount);
      expect(result).toEqual({
        transaction: mockTransactionDto,
        account: mockAccountDto,
        summary: mockSummaryDto,
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of TransactionDto for the user', async () => {
      const list = [mockTransaction];
      service.findAll.mockResolvedValue(list);
      service.toTransactionDto.mockReturnValue(mockTransactionDto);

      const result = await controller.findAll(mockUser, {});

      expect(service.findAll).toHaveBeenCalledWith(mockUser.userId, {});
      expect(service.toTransactionDto).toHaveBeenCalledTimes(1);
      expect(service.toTransactionDto).toHaveBeenCalledWith(mockTransaction, {
        settings: null,
        rates: [],
      });
      expect(result).toEqual([mockTransactionDto]);
    });
  });

  describe('findOne', () => {
    it('should return a TransactionDto by id', async () => {
      service.findOne.mockResolvedValue(mockTransaction);
      service.toTransactionDto.mockReturnValue(mockTransactionDto);

      const result = await controller.findOne(mockUser, mockTransaction._id);

      expect(service.findOne).toHaveBeenCalledWith(
        mockUser.userId,
        mockTransaction._id,
      );
      expect(service.toTransactionDto).toHaveBeenCalledWith(mockTransaction, {
        settings: null,
        rates: [],
      });
      expect(result).toEqual(mockTransactionDto);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne(mockUser, 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a transaction and return TransactionDto', async () => {
      const updateDto: UpdateTransactionDto = { comment: 'Updated comment' };
      const updated = { ...mockTransaction, comment: 'Updated comment' };
      const updatedDto = { ...mockTransactionDto, comment: 'Updated comment' };
      service.update.mockResolvedValue(updated);
      service.toTransactionDto.mockReturnValue(updatedDto);

      const result = await controller.update(
        mockUser,
        mockTransaction._id,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockUser.userId,
        mockTransaction._id,
        updateDto,
      );
      expect(service.toTransactionDto).toHaveBeenCalledWith(updated, {
        settings: null,
        rates: [],
      });
      expect(result).toEqual(updatedDto);
    });
  });

  describe('remove', () => {
    it('should remove a transaction and return void', async () => {
      service.remove.mockResolvedValue(true);

      await controller.remove(mockUser, mockTransaction._id);

      expect(service.remove).toHaveBeenCalledWith(
        mockUser.userId,
        mockTransaction._id,
      );
    });
  });
});
