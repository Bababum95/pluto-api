import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import type {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './transaction.dto';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { AccountService } from '../account/account.service';
import type { RequestUser } from '../auth/auth.dto';
import { TransactionType } from './transaction.enum';

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

  const mockTransactionDto = {
    id: mockTransaction._id,
    type: mockTransaction.type,
    category: mockTransaction.category,
    comment: mockTransaction.comment,
    account: mockTransaction.account,
    amount: -1500.5,
    amount_raw: mockTransaction.amount,
    scale: mockTransaction.scale,
    tags: mockTransaction.tags,
    createdAt: mockTransaction.createdAt.toISOString(),
    updatedAt: mockTransaction.updatedAt.toISOString(),
  };

  const mockAccountDto = {
    id: mockTransaction.account,
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

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: AccountService, useValue: mockAccountService },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
    service = module.get(TransactionService);
    accountService = module.get(AccountService);
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
      expect(service.toTransactionDto).toHaveBeenCalledWith(mockTransaction);
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

      const result = await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.userId);
      expect(service.toTransactionDto).toHaveBeenCalledTimes(1);
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
      expect(service.toTransactionDto).toHaveBeenCalledWith(mockTransaction);
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
      expect(service.toTransactionDto).toHaveBeenCalledWith(updated);
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
