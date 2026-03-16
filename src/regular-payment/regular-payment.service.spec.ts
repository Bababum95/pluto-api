import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { Model, Types } from 'mongoose';

import { Category, CategoryDocument } from '../category/category.schema';
import { Account, AccountDocument } from '../account/account.schema';
import { Tag } from '../tag/tag.schema';
import { CategoryService } from '../category/category.service';
import { AccountService } from '../account/account.service';
import { TagService } from '../tag/tag.service';
import { MoneyService } from '../money/money.service';

import {
  RegularPayment,
  RegularPaymentDocument,
} from './regular-payment.schema';
import { RegularPaymentService } from './regular-payment.service';
import type {
  CreateRegularPaymentDto,
  UpdateRegularPaymentDto,
} from './regular-payment.dto';
import { TransactionType } from '../transaction/transaction.enum';

const mockI18nService = {
  t: (key: string, options?: { defaultValue?: string }): string => {
    const messages: Record<string, string> = {
      'regularPayment.errors.categoryNotFound': 'Category not found',
      'regularPayment.errors.accountNotFound': 'Account not found',
      'regularPayment.errors.tagNotFound': 'One or more tags not found',
      'regularPayment.create.failed': 'Regular payment creation failed',
      'regularPayment.errors.notFound': 'Regular payment not found',
    };
    return options?.defaultValue ?? messages[key] ?? key;
  },
};

const createChain = (resolvedValue: unknown) => ({
  exec: jest.fn().mockResolvedValue(resolvedValue),
  lean: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  populate: jest.fn().mockReturnThis(),
});

describe('RegularPaymentService', () => {
  let service: RegularPaymentService;
  let mockRegularPaymentModel: Model<unknown> & {
    find: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOneAndDelete: jest.Mock;
  };
  let mockCategoryModel: Model<unknown> & { findOne: jest.Mock };
  let mockAccountModel: Model<unknown> & { findOne: jest.Mock };
  let mockTagModel: Model<unknown> & { find: jest.Mock };
  let saveMock: jest.Mock;

  const userId = '507f1f77bcf86cd799439011';
  const paymentId = new Types.ObjectId('507f1f77bcf86cd799439099');
  const categoryId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const accountId = new Types.ObjectId('507f1f77bcf86cd799439013');
  const tagId = new Types.ObjectId('507f1f77bcf86cd799439014');

  const mockRegularPayment = {
    _id: paymentId,
    user: new Types.ObjectId(userId),
    type: TransactionType.EXPENSE,
    category: { _id: categoryId },
    account: {
      _id: accountId,
      balance: {
        original: {
          currency: {
            id: 'curr1',
            code: 'USD',
            symbol: '$',
            decimal_digits: 2,
          },
        },
      },
    },
    amount: -150050,
    scale: 2,
    comment: 'Monthly rent',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as RegularPaymentDocument;

  const mockCategoryDto = {
    id: categoryId.toString(),
    name: 'Rent',
    color: '#333',
    icon: 'home',
  };

  const mockAccountDto = {
    id: accountId.toString(),
    name: 'Main',
    balance: {
      original: {
        currency: { id: 'curr1', code: 'USD', symbol: '$', decimal_digits: 2 },
      },
      converted: {},
    },
  };

  const mockTagDto = { id: tagId.toString(), name: 'Utilities' };

  beforeEach(async () => {
    saveMock = jest.fn().mockResolvedValue(undefined);

    const MockRegularPaymentModel = function (
      this: { _id: Types.ObjectId; save: jest.Mock },
      dto?: Record<string, unknown>,
    ) {
      this._id = paymentId;
      this.save = saveMock;
      Object.assign(this, dto);
    } as unknown as Model<unknown> & {
      find: jest.Mock;
      findOne: jest.Mock;
      findById: jest.Mock;
      findOneAndUpdate: jest.Mock;
      findOneAndDelete: jest.Mock;
    };

    const chainNull = createChain(null);

    MockRegularPaymentModel.find = jest.fn().mockReturnValue(createChain([]));
    MockRegularPaymentModel.findOne = jest.fn().mockReturnValue(chainNull);
    MockRegularPaymentModel.findById = jest.fn().mockReturnValue(chainNull);
    MockRegularPaymentModel.findOneAndUpdate = jest
      .fn()
      .mockReturnValue(chainNull);
    MockRegularPaymentModel.findOneAndDelete = jest
      .fn()
      .mockReturnValue(chainNull);

    const mockCategoryModelInstance = {
      findOne: jest.fn().mockReturnValue(createChain(null)),
    };

    const mockAccountModelInstance = {
      findOne: jest.fn().mockReturnValue(createChain(null)),
    };

    const mockTagModelInstance = {
      find: jest.fn().mockReturnValue(createChain([])),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegularPaymentService,
        {
          provide: getModelToken(RegularPayment.name),
          useValue: MockRegularPaymentModel,
        },
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModelInstance,
        },
        {
          provide: getModelToken(Account.name),
          useValue: mockAccountModelInstance,
        },
        {
          provide: getModelToken(Tag.name),
          useValue: mockTagModelInstance,
        },
        {
          provide: CategoryService,
          useValue: {
            toCategoryDto: jest.fn().mockReturnValue(mockCategoryDto),
          },
        },
        {
          provide: AccountService,
          useValue: { toAccountDto: jest.fn().mockReturnValue(mockAccountDto) },
        },
        {
          provide: TagService,
          useValue: { toTagDto: jest.fn().mockReturnValue(mockTagDto) },
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
        {
          provide: MoneyService,
          useValue: {
            fromMinorUnits: jest.fn(
              (raw: number, scale: number) => raw / Math.pow(10, scale),
            ),
            convertAmount: jest.fn((_, __, ___, targetCurrency) =>
              targetCurrency
                ? { value: -1500.5, raw: -150050, scale: 2, currency: {} }
                : null,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<RegularPaymentService>(RegularPaymentService);
    mockRegularPaymentModel = module.get(getModelToken(RegularPayment.name));
    mockCategoryModel = module.get(getModelToken(Category.name));
    mockAccountModel = module.get(getModelToken(Account.name));
    mockTagModel = module.get(getModelToken(Tag.name));

    jest.clearAllMocks();

    mockRegularPaymentModel.find.mockReturnValue(createChain([]));
    mockRegularPaymentModel.findOne.mockReturnValue(createChain(null));
    mockRegularPaymentModel.findById.mockReturnValue(createChain(null));
    mockRegularPaymentModel.findOneAndUpdate.mockReturnValue(createChain(null));
    mockRegularPaymentModel.findOneAndDelete.mockReturnValue(createChain(null));
    mockCategoryModel.findOne.mockReturnValue(createChain(null));
    mockAccountModel.findOne.mockReturnValue(createChain(null));
    mockTagModel.find.mockReturnValue(createChain([]));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateRegularPaymentDto = {
      type: TransactionType.EXPENSE,
      category: categoryId.toString(),
      account: accountId.toString(),
      amount: -1500.5,
      scale: 2,
      comment: 'Monthly rent',
    };

    it('should create a regular payment and return populated document', async () => {
      mockCategoryModel.findOne.mockReturnValue(
        createChain({ _id: categoryId } as unknown as CategoryDocument),
      );
      mockAccountModel.findOne.mockReturnValue(
        createChain({ _id: accountId } as unknown as AccountDocument),
      );
      mockRegularPaymentModel.findById.mockReturnValue(
        createChain(mockRegularPayment),
      );

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
      expect(result).toEqual(mockRegularPayment);
    });

    it('should throw BadRequestException when category not found', async () => {
      mockCategoryModel.findOne.mockReturnValue(createChain(null));

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createDto)).rejects.toThrow(
        'Category not found',
      );
    });

    it('should throw BadRequestException when account not found', async () => {
      mockCategoryModel.findOne.mockReturnValue(
        createChain({ _id: categoryId }),
      );
      mockAccountModel.findOne.mockReturnValue(createChain(null));

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createDto)).rejects.toThrow(
        'Account not found',
      );
    });

    it('should throw BadRequestException when tag not found', async () => {
      const dtoWithTags: CreateRegularPaymentDto = {
        ...createDto,
        tags: [tagId.toString(), new Types.ObjectId().toString()],
      };
      mockCategoryModel.findOne.mockReturnValue(
        createChain({ _id: categoryId }),
      );
      mockAccountModel.findOne.mockReturnValue(createChain({ _id: accountId }));
      mockTagModel.find.mockReturnValue(createChain([{ _id: tagId }]));

      await expect(service.create(userId, dtoWithTags)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, dtoWithTags)).rejects.toThrow(
        'One or more tags not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of regular payments for the user', async () => {
      const list = [mockRegularPayment];
      mockRegularPaymentModel.find.mockReturnValue(createChain(list));

      const result = await service.findAll(userId);

      expect(mockRegularPaymentModel.find).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(list);
    });
  });

  describe('findOne', () => {
    it('should return a regular payment by id for the user', async () => {
      mockRegularPaymentModel.findOne.mockReturnValue(
        createChain(mockRegularPayment),
      );

      const result = await service.findOne(userId, paymentId.toString());

      expect(mockRegularPaymentModel.findOne).toHaveBeenCalledWith({
        _id: paymentId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(mockRegularPayment);
    });

    it('should return null when regular payment not found', async () => {
      mockRegularPaymentModel.findOne.mockReturnValue(createChain(null));

      const result = await service.findOne(userId, 'invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateDto: UpdateRegularPaymentDto = { comment: 'Updated rent' };

    it('should update a regular payment and return it', async () => {
      const updated = { ...mockRegularPayment, comment: 'Updated rent' };
      mockRegularPaymentModel.findOneAndUpdate.mockReturnValue(
        createChain(updated),
      );

      const result = await service.update(
        userId,
        paymentId.toString(),
        updateDto,
      );

      expect(mockRegularPaymentModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: paymentId.toString(),
          user: new Types.ObjectId(userId),
        },
        { comment: 'Updated rent' },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when regular payment not found', async () => {
      mockRegularPaymentModel.findOneAndUpdate.mockReturnValue(
        createChain(null),
      );

      await expect(
        service.update(userId, 'invalid-id', updateDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(userId, 'invalid-id', updateDto),
      ).rejects.toThrow('Regular payment not found');
    });

    it('should validate category when provided in update', async () => {
      const updateWithCategory: UpdateRegularPaymentDto = {
        category: new Types.ObjectId().toString(),
      };
      mockCategoryModel.findOne.mockReturnValue(createChain(null));
      mockRegularPaymentModel.findOneAndUpdate.mockReturnValue(
        createChain(mockRegularPayment),
      );

      await expect(
        service.update(userId, paymentId.toString(), updateWithCategory),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove a regular payment and return true', async () => {
      mockRegularPaymentModel.findOneAndDelete.mockReturnValue(
        createChain(mockRegularPayment),
      );

      const result = await service.remove(userId, paymentId.toString());

      expect(mockRegularPaymentModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: paymentId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(result).toBe(true);
    });

    it('should throw NotFoundException when regular payment not found', async () => {
      mockRegularPaymentModel.findOneAndDelete.mockReturnValue(
        createChain(null),
      );

      await expect(service.remove(userId, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove(userId, 'invalid-id')).rejects.toThrow(
        'Regular payment not found',
      );
    });
  });

  describe('toRegularPaymentDto', () => {
    const options = {
      settings: { currency: { code: 'USD', decimal_digits: 2 } as never },
      rates: [],
    };

    it('should convert RegularPaymentDocument to RegularPaymentDto', () => {
      const dto = service.toRegularPaymentDto(mockRegularPayment, options);

      expect(dto).toMatchObject({
        id: mockRegularPayment._id.toString(),
        type: TransactionType.EXPENSE,
        comment: mockRegularPayment.comment,
        createdAt: mockRegularPayment.createdAt.toISOString(),
        updatedAt: mockRegularPayment.updatedAt.toISOString(),
      });
      expect(dto.category).toEqual(mockCategoryDto);
      expect(dto.account).toEqual(mockAccountDto);
      expect(dto.amount).toBeDefined();
      expect(dto.amount.original).toBeDefined();
      expect(dto.amount.converted).toBeDefined();
      expect(dto.tags).toEqual([]);
    });

    it('should throw Error when category is null', () => {
      const paymentWithoutCategory = {
        ...mockRegularPayment,
        category: null,
      };

      expect(() =>
        service.toRegularPaymentDto(paymentWithoutCategory as never, options),
      ).toThrow(
        'Regular payment must have category and account populated before mapping to DTO',
      );
    });

    it('should throw Error when account is null', () => {
      const paymentWithoutAccount = {
        ...mockRegularPayment,
        account: null,
      };

      expect(() =>
        service.toRegularPaymentDto(paymentWithoutAccount as never, options),
      ).toThrow(
        'Regular payment must have category and account populated before mapping to DTO',
      );
    });
  });
});
