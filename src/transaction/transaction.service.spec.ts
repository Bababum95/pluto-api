import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { Types } from 'mongoose';

import { Transaction, TransactionDocument } from './transaction.schema';
import { Category } from '../category/category.schema';
import { Account } from '../account/account.schema';
import { Tag } from '../tag/tag.schema';
import {
  TransactionService,
  type TransactionDocumentPopulated,
} from './transaction.service';
import { TransactionType } from './transaction.enum';
import { CategoryService } from '../category/category.service';
import { AccountService } from '../account/account.service';
import { TagService } from '../tag/tag.service';
import { MoneyService } from '../money/money.service';
import type {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './transaction.dto';

const mockI18nService = {
  t: (key: string, options?: { defaultValue?: string }): string => {
    const messages: Record<string, string> = {
      'transaction.errors.categoryNotFound': 'Category not found',
      'transaction.errors.accountNotFound': 'Account not found',
      'transaction.errors.tagNotFound': 'One or more tags not found',
      'transaction.create.failed': 'Transaction creation failed',
      'transaction.errors.notFound': 'Transaction not found',
    };
    return options?.defaultValue ?? messages[key] ?? key;
  },
};

const createChain = (resolvedValue: unknown) => ({
  exec: jest.fn().mockResolvedValue(resolvedValue),
  lean: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  session: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
});

describe('TransactionService', () => {
  let service: TransactionService;
  let mockTransactionModel: {
    findOne: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOneAndDelete: jest.Mock;
  };
  let mockCategoryModel: { findOne: jest.Mock };
  let mockAccountModel: { findOne: jest.Mock; updateOne: jest.Mock };
  let mockTagModel: { find: jest.Mock };
  let saveMock: jest.Mock;

  const userId = '507f1f77bcf86cd799439011';
  const transactionId = new Types.ObjectId('507f1f77bcf86cd799439013');
  const categoryId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const accountId = new Types.ObjectId('507f1f77bcf86cd799439014');
  const tagId = new Types.ObjectId('507f1f77bcf86cd799439015');

  const mockCategoryDoc = {
    _id: categoryId,
    name: 'Food & Dining',
    color: '#FF5733',
    icon: 'wallet',
    type: TransactionType.EXPENSE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAccountDoc = {
    _id: accountId,
    name: 'Main Wallet',
    balance: 100050,
    scale: 2,
    color: '#FF5733',
    icon: 'wallet',
    currency: { _id: new Types.ObjectId(), code: 'USD', symbol: '$' },
    order: 0,
    excluded: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTagDoc = {
    _id: tagId,
    name: 'food',
    color: '#6B7280',
    icon: 'tag',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {
    _id: transactionId,
    user: new Types.ObjectId(userId),
    type: TransactionType.EXPENSE,
    category: categoryId,
    comment: 'Lunch',
    account: accountId,
    amount: -150050,
    scale: 2,
    tags: [tagId],
    date: '2024-01-15',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as TransactionDocument;

  const mockTransactionPopulated = {
    ...mockTransaction,
    category: mockCategoryDoc,
    account: mockAccountDoc,
    tags: [mockTagDoc],
  } as unknown as TransactionDocumentPopulated;

  beforeEach(async () => {
    saveMock = jest.fn().mockResolvedValue(undefined);
    const chainNull = createChain(null);
    function MockTransactionModel(this: {
      _id: Types.ObjectId;
      save: jest.Mock;
    }) {
      this._id = transactionId;
      this.save = saveMock;
    }
    const MockTransactionModelStatics = {
      findOne: jest.fn().mockReturnValue(chainNull),
      find: jest.fn().mockReturnValue(createChain([])),
      findById: jest.fn().mockReturnValue(createChain(mockTransaction)),
      findOneAndUpdate: jest.fn().mockReturnValue(chainNull),
      findOneAndDelete: jest.fn().mockReturnValue(chainNull),
    };
    const MockTransactionModelWithStatics = Object.assign(
      MockTransactionModel,
      MockTransactionModelStatics,
    );
    mockTransactionModel = MockTransactionModelStatics;

    mockCategoryModel = {
      findOne: jest.fn().mockReturnValue(createChain({ _id: categoryId })),
    };
    mockAccountModel = {
      findOne: jest
        .fn()
        .mockReturnValue(createChain({ _id: accountId, scale: 2 })),
      updateOne: jest.fn().mockReturnValue(createChain({ modifiedCount: 1 })),
    };
    mockTagModel = {
      find: jest
        .fn()
        .mockReturnValue(
          createChain([{ _id: tagId, user: new Types.ObjectId(userId) }]),
        ),
    };

    const mockSession = {
      withTransaction: jest.fn((cb: () => Promise<unknown>) => cb()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        MoneyService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: getModelToken(Transaction.name),
          useValue: MockTransactionModelWithStatics,
        },
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: mockAccountModel,
        },
        {
          provide: getModelToken(Tag.name),
          useValue: mockTagModel,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: CategoryService,
          useValue: {
            toCategoryDto: jest
              .fn()
              .mockImplementation(
                (cat: { _id: Types.ObjectId; name: string }) => ({
                  id: cat._id.toString(),
                  name: cat.name,
                  color: '#FF5733',
                  icon: 'wallet',
                  type: 'expense',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }),
              ),
          },
        },
        {
          provide: TagService,
          useValue: {
            incrementUsageCount: jest.fn().mockResolvedValue(undefined),
            toTagDto: jest
              .fn()
              .mockImplementation(
                (t: { _id: Types.ObjectId; name: string }) => ({
                  id: t._id.toString(),
                  name: t.name,
                  color: '#6B7280',
                  icon: 'tag',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }),
              ),
          },
        },
        {
          provide: AccountService,
          useValue: {
            toAccountDto: jest
              .fn()
              .mockImplementation(
                (acc: { _id: Types.ObjectId; name: string }) => ({
                  id: acc._id.toString(),
                  name: acc.name,
                  balance: {
                    original: {
                      value: 1000.5,
                      raw: 100050,
                      scale: 2,
                      currency: { code: 'USD', symbol: '$', decimal_digits: 2 },
                    },
                    converted: {
                      value: 1000.5,
                      raw: 100050,
                      scale: 2,
                      currency: { code: 'USD', symbol: '$', decimal_digits: 2 },
                    },
                  },
                  color: '#FF5733',
                  icon: 'wallet',
                  order: 0,
                  excluded: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }),
              ),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    jest.clearAllMocks();

    mockCategoryModel.findOne.mockReturnValue(createChain({ _id: categoryId }));
    mockAccountModel.findOne.mockReturnValue(
      createChain({ _id: accountId, scale: 2 }),
    );
    mockTransactionModel.findOne.mockReturnValue(createChain(null));
    mockTransactionModel.find.mockReturnValue(createChain([]));
    mockTransactionModel.findById.mockReturnValue(
      createChain(mockTransactionPopulated),
    );
    mockTransactionModel.findOneAndUpdate.mockReturnValue(
      createChain(mockTransaction),
    );
    mockTransactionModel.findOneAndDelete.mockReturnValue(
      createChain(mockTransaction),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction and return it', async () => {
      const createDto: CreateTransactionDto = {
        type: TransactionType.EXPENSE,
        category: categoryId.toString(),
        comment: 'Lunch',
        account: accountId.toString(),
        amount: -1500.5,
        scale: 2,
        tags: [tagId.toString()],
        date: '2024-01-15',
      };

      const result = await service.create(userId, createDto);

      expect(mockCategoryModel.findOne).toHaveBeenCalledWith({
        _id: categoryId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(mockAccountModel.findOne).toHaveBeenCalledWith({
        _id: accountId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(mockTransactionPopulated);
    });

    it('converts the amount to the account scale within the session', async () => {
      const accountQuery = createChain({ _id: accountId, scale: 2 });
      mockAccountModel.findOne.mockReturnValue(accountQuery);

      await service.create(userId, {
        type: TransactionType.EXPENSE,
        category: categoryId.toString(),
        account: accountId.toString(),
        amount: 23,
        scale: 0,
        date: '2024-01-15',
      });

      expect(accountQuery.session).toHaveBeenCalled();
      const session: unknown = (
        accountQuery.session.mock.calls as unknown[][]
      )[0][0];
      expect(mockAccountModel.updateOne).toHaveBeenCalledWith(
        { _id: accountId.toString(), user: new Types.ObjectId(userId) },
        { $inc: { balance: -2300 } },
        { session },
      );
    });

    it('should throw BadRequestException when category not found', async () => {
      mockCategoryModel.findOne.mockReturnValue(createChain(null));

      const createDto: CreateTransactionDto = {
        type: TransactionType.EXPENSE,
        category: categoryId.toString(),
        account: accountId.toString(),
        amount: -1500.5,
        scale: 2,
        date: '2024-01-15',
      };

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createDto)).rejects.toThrow(
        'Category not found',
      );
    });

    it('should throw BadRequestException when account not found', async () => {
      mockAccountModel.findOne.mockReturnValue(createChain(null));

      const createDto: CreateTransactionDto = {
        type: TransactionType.EXPENSE,
        category: categoryId.toString(),
        account: accountId.toString(),
        amount: -1500.5,
        scale: 2,
        date: '2024-01-15',
      };

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createDto)).rejects.toThrow(
        'Account not found',
      );
    });
  });

  describe('calculation audit', () => {
    it.each([
      [TransactionType.EXPENSE, 23, 0, 2, -2300],
      [TransactionType.INCOME, 23, 0, 2, 2300],
      [TransactionType.EXPENSE, 1005, 3, 2, -101],
      [TransactionType.INCOME, 1004, 3, 2, 100],
      [TransactionType.EXPENSE, 23, 2, 0, -0],
      [TransactionType.INCOME, 0, 2, 2, 0],
      [TransactionType.EXPENSE, -23, 0, 2, -2300],
    ])(
      'create %s raw=%s scale=%s accountScale=%s yields %s',
      async (type, amount, scale, accountScale, expected) => {
        mockAccountModel.findOne.mockReturnValue(
          createChain({ _id: accountId, scale: accountScale }),
        );
        await service.create(userId, {
          type,
          amount,
          scale,
          category: categoryId.toString(),
          account: accountId.toString(),
          date: '2024-01-15',
        });
        const calls = mockAccountModel.updateOne.mock.calls as unknown[][];
        expect(
          (calls[0][1] as { $inc: { balance: number } }).$inc.balance,
        ).toBe(expected);
      },
    );

    it.each([
      ['amount and scale', 23, 0, { amount: 2500, scale: 2 }, -200],
      ['scale only', 2300, 2, { scale: 3 }, 2070],
      ['negative expense', -2300, 2, { amount: -2500 }, -200],
      ['equivalent representations', 23, 0, { amount: 2300, scale: 2 }, 0],
    ] as const)(
      'update recalculates %s in account minor units',
      async (_name, amount, scale, changes, expected) => {
        mockTransactionModel.findOne.mockReturnValue(
          createChain({ ...mockTransaction, amount, scale }),
        );
        await service.update(userId, transactionId.toString(), changes, {
          recalcBalance: true,
        });
        const calls = mockAccountModel.updateOne.mock.calls as unknown[][];
        const increment = calls.reduce(
          (sum, call) =>
            sum + (call[1] as { $inc: { balance: number } }).$inc.balance,
          0,
        );
        expect(increment).toBe(expected);
      },
    );
  });

  describe('balance recalculation', () => {
    it.each([
      [TransactionType.EXPENSE, TransactionType.INCOME, 4600],
      [TransactionType.INCOME, TransactionType.EXPENSE, -4600],
    ])(
      'handles a type change from %s to %s',
      async (oldType, type, expected) => {
        mockTransactionModel.findOne.mockReturnValue(
          createChain({ ...mockTransaction, type: oldType, amount: 2300 }),
        );
        await service.update(
          userId,
          transactionId.toString(),
          { type },
          { recalcBalance: true },
        );
        const calls = mockAccountModel.updateOne.mock.calls as unknown[][];
        expect(
          (calls[0][1] as { $inc: { balance: number } }).$inc.balance,
        ).toBe(expected);
      },
    );

    it('reverses and applies an expense using each account scale', async () => {
      const otherAccountId = new Types.ObjectId();
      mockTransactionModel.findOne.mockReturnValue(
        createChain({ ...mockTransaction, amount: -2300, scale: 2 }),
      );
      mockAccountModel.findOne.mockImplementation(
        (filter: { _id: Types.ObjectId | string }) =>
          createChain({
            _id: filter._id,
            scale: filter._id.toString() === accountId.toString() ? 2 : 0,
          }),
      );
      await service.update(
        userId,
        transactionId.toString(),
        { account: otherAccountId.toString(), amount: 25, scale: 0 },
        { recalcBalance: true },
      );
      const calls = mockAccountModel.updateOne.mock.calls as unknown[][];
      expect(calls).toHaveLength(2);
      expect(calls[0][0]).toEqual({
        _id: accountId,
        user: new Types.ObjectId(userId),
      });
      expect(calls[0][1]).toEqual({ $inc: { balance: 2300 } });
      expect(calls[1][0]).toEqual({
        _id: otherAccountId,
        user: new Types.ObjectId(userId),
      });
      expect(calls[1][1]).toEqual({ $inc: { balance: -25 } });
    });

    it('rounds each amount before subtracting the old balance effect', async () => {
      mockTransactionModel.findOne.mockReturnValue(
        createChain({ ...mockTransaction, amount: 1004, scale: 3 }),
      );
      await service.update(
        userId,
        transactionId.toString(),
        { amount: 1005 },
        { recalcBalance: true },
      );
      const calls = mockAccountModel.updateOne.mock.calls as unknown[][];
      expect(calls[0][1]).toEqual({ $inc: { balance: -1 } });
    });

    it.each([undefined, false])(
      'leaves balance unchanged with recalcBalance=%s',
      async (recalcBalance) => {
        mockTransactionModel.findOne.mockReturnValue(
          createChain(mockTransaction),
        );
        await service.update(
          userId,
          transactionId.toString(),
          { amount: 5000, scale: 0 },
          { recalcBalance },
        );
        expect(mockAccountModel.updateOne).not.toHaveBeenCalled();
      },
    );

    it('rejects a missing account before modifying the balance or transaction', async () => {
      mockTransactionModel.findOne.mockReturnValue(
        createChain(mockTransaction),
      );
      mockAccountModel.findOne.mockReturnValue(createChain(null));
      await expect(
        service.update(
          userId,
          transactionId.toString(),
          { amount: 5000 },
          { recalcBalance: true },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockAccountModel.updateOne).not.toHaveBeenCalled();
      expect(mockTransactionModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of transactions for the user', async () => {
      const list = [mockTransaction];
      mockTransactionModel.find.mockReturnValue(createChain(list));

      const result = await service.findAll(userId);

      expect(mockTransactionModel.find).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(list);
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id for the user', async () => {
      mockTransactionModel.findOne.mockReturnValue(
        createChain(mockTransaction),
      );

      const result = await service.findOne(userId, transactionId.toString());

      expect(mockTransactionModel.findOne).toHaveBeenCalledWith({
        _id: transactionId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(mockTransaction);
    });

    it('should return null when transaction not found', async () => {
      mockTransactionModel.findOne.mockReturnValue(createChain(null));

      const result = await service.findOne(userId, 'invalid');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a transaction and return it', async () => {
      const updateDto: UpdateTransactionDto = { comment: 'Updated comment' };
      const updated = { ...mockTransaction, comment: 'Updated comment' };
      const expectedPopulated = {
        ...mockTransactionPopulated,
        comment: 'Updated comment',
      };
      mockTransactionModel.findOne.mockReturnValue(
        createChain(mockTransaction),
      );
      mockTransactionModel.findOneAndUpdate.mockReturnValue(
        createChain(updated),
      );
      mockTransactionModel.findById.mockReturnValue(
        createChain(expectedPopulated),
      );

      const result = await service.update(
        userId,
        transactionId.toString(),
        updateDto,
      );

      expect(mockTransactionModel.findOne).toHaveBeenCalledWith({
        _id: transactionId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(mockTransactionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: transactionId.toString(),
          user: new Types.ObjectId(userId),
        },
        expect.objectContaining({ comment: 'Updated comment' }),
        expect.objectContaining({ new: true }),
      );
      expect(result).toEqual(expectedPopulated);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      mockTransactionModel.findOneAndUpdate.mockReturnValue(createChain(null));

      await expect(
        service.update(userId, 'invalid', { comment: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a transaction and return true', async () => {
      mockTransactionModel.findOneAndDelete.mockReturnValue(
        createChain(mockTransaction),
      );

      const result = await service.remove(userId, transactionId.toString());

      expect(mockTransactionModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: transactionId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(result).toBe(true);
    });

    it('should throw NotFoundException when transaction not found', async () => {
      mockTransactionModel.findOneAndDelete.mockReturnValue(createChain(null));

      await expect(service.remove(userId, 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toTransactionDto', () => {
    it('should convert populated TransactionDocument to TransactionDto with category and account DTOs', () => {
      const dto = service.toTransactionDto(mockTransactionPopulated, {
        settings: null,
        rates: [],
      });

      expect(dto.id).toBe(mockTransaction._id.toString());
      expect(dto.type).toBe(mockTransaction.type);
      expect(dto.category).toEqual(
        expect.objectContaining({
          id: categoryId.toString(),
          name: 'Food & Dining',
        }),
      );
      expect(dto.comment).toBe(mockTransaction.comment);
      expect(dto.amount.original.value).toBe(-1500.5);
      expect(dto.amount.original.raw).toBe(mockTransaction.amount);
      expect(dto.amount.original.scale).toBe(mockTransaction.scale);
      expect(dto.amount.original.currency).toEqual(
        expect.objectContaining({ code: 'USD', symbol: '$' }),
      );
      expect(dto.amount.converted).toEqual(dto.amount.original);
      expect(dto.tags).toHaveLength(1);
      expect(dto.tags[0]).toEqual(
        expect.objectContaining({
          id: tagId.toString(),
          name: 'food',
        }),
      );
      expect(dto.date).toBe('2024-01-15');
      expect(dto.createdAt).toBe(mockTransaction.createdAt.toISOString());
      expect(dto.updatedAt).toBe(mockTransaction.updatedAt.toISOString());
    });
  });
});
