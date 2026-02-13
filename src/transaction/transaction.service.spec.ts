import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { Types } from 'mongoose';

import { Transaction, TransactionDocument } from './transaction.schema';
import { Category } from '../category/category.schema';
import { Account } from '../account/account.schema';
import { TransactionService } from './transaction.service';
import type {
  CreateTransactionDto,
  UpdateTransactionDto,
} from './transaction.dto';
import { TransactionType } from './transaction.enum';

const mockI18nService = {
  t: (key: string, options?: { defaultValue?: string }): string => {
    const messages: Record<string, string> = {
      'transaction.errors.categoryNotFound': 'Category not found',
      'transaction.errors.accountNotFound': 'Account not found',
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
  let mockAccountModel: { findOne: jest.Mock };
  let saveMock: jest.Mock;

  const userId = '507f1f77bcf86cd799439011';
  const transactionId = new Types.ObjectId('507f1f77bcf86cd799439013');
  const categoryId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const accountId = new Types.ObjectId('507f1f77bcf86cd799439014');

  const mockTransaction = {
    _id: transactionId,
    user: new Types.ObjectId(userId),
    type: TransactionType.EXPENSE,
    category: categoryId,
    comment: 'Lunch',
    account: accountId,
    amount: -150050,
    scale: 2,
    tags: ['food'],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as TransactionDocument;

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
      findOne: jest.fn().mockReturnValue(createChain({ _id: accountId })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
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
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
    jest.clearAllMocks();

    mockCategoryModel.findOne.mockReturnValue(createChain({ _id: categoryId }));
    mockAccountModel.findOne.mockReturnValue(createChain({ _id: accountId }));
    mockTransactionModel.findOne.mockReturnValue(createChain(null));
    mockTransactionModel.find.mockReturnValue(createChain([]));
    mockTransactionModel.findById.mockReturnValue(createChain(mockTransaction));
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
        tags: ['food'],
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
      expect(result).toEqual(mockTransaction);
    });

    it('should throw BadRequestException when category not found', async () => {
      mockCategoryModel.findOne.mockReturnValue(createChain(null));

      const createDto: CreateTransactionDto = {
        type: TransactionType.EXPENSE,
        category: categoryId.toString(),
        account: accountId.toString(),
        amount: -1500.5,
        scale: 2,
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
      };

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createDto)).rejects.toThrow(
        'Account not found',
      );
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
      mockTransactionModel.findOneAndUpdate.mockReturnValue(
        createChain(updated),
      );

      const result = await service.update(
        userId,
        transactionId.toString(),
        updateDto,
      );

      expect(mockTransactionModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: transactionId.toString(),
          user: new Types.ObjectId(userId),
        },
        expect.objectContaining({ comment: 'Updated comment' }),
        { new: true },
      );
      expect(result).toEqual(updated);
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
    it('should convert TransactionDocument to TransactionDto', () => {
      const dto = service.toTransactionDto(mockTransaction);

      expect(dto.id).toBe(mockTransaction._id.toString());
      expect(dto.type).toBe(mockTransaction.type);
      expect(dto.category).toBe(mockTransaction.category.toString());
      expect(dto.comment).toBe(mockTransaction.comment);
      expect(dto.account).toBe(mockTransaction.account.toString());
      expect(dto.amount).toBe(-1500.5);
      expect(dto.amount_raw).toBe(mockTransaction.amount);
      expect(dto.scale).toBe(mockTransaction.scale);
      expect(dto.tags).toEqual(mockTransaction.tags);
      expect(dto.createdAt).toBe(mockTransaction.createdAt.toISOString());
      expect(dto.updatedAt).toBe(mockTransaction.updatedAt.toISOString());
    });
  });
});
