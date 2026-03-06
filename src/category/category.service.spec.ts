import { NotFoundException, ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { Model, Types } from 'mongoose';

import { Category, CategoryDocument } from './category.schema';
import { CategoryService } from './category.service';
import type { CreateCategoryDto, UpdateCategoryDto } from './category.dto';
import { TransactionType } from '../transaction/transaction.enum';

const mockI18nService = {
  t: (key: string, options?: { defaultValue?: string }): string => {
    const messages: Record<string, string> = {
      'category.errors.nameAlreadyExists':
        'Category with this name already exists',
      'category.create.failed': 'Category creation failed',
      'category.errors.notFound': 'Category not found',
    };
    return options?.defaultValue ?? messages[key] ?? key;
  },
};

const createChain = (resolvedValue: unknown) => ({
  exec: jest.fn().mockResolvedValue(resolvedValue),
  lean: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
});

describe('CategoryService', () => {
  let service: CategoryService;
  let mockCategoryModel: Model<unknown> & {
    findOne: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOneAndDelete: jest.Mock;
    bulkWrite: jest.Mock;
  };
  let saveMock: jest.Mock;

  const userId = '507f1f77bcf86cd799439011';
  const categoryId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockCategory = {
    _id: categoryId,
    user: new Types.ObjectId(userId),
    color: '#FF5733',
    icon: 'wallet',
    name: 'Food & Dining',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as CategoryDocument;

  beforeEach(async () => {
    saveMock = jest.fn().mockResolvedValue(undefined);
    const MockModel = function (this: unknown, dto?: CreateCategoryDto) {
      const instance = {
        _id: mockCategory._id,
        user: new Types.ObjectId(userId),
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
      findOneAndUpdate: jest.Mock;
      findOneAndDelete: jest.Mock;
    };

    const chainNull = createChain(null);

    MockModel.findOne = jest.fn().mockReturnValue(chainNull);
    MockModel.find = jest.fn().mockReturnValue(createChain([]));
    MockModel.findById = jest.fn().mockReturnValue(chainNull);
    MockModel.findOneAndUpdate = jest.fn().mockReturnValue(chainNull);
    MockModel.findOneAndDelete = jest.fn().mockReturnValue(chainNull);
    MockModel.bulkWrite = jest.fn().mockResolvedValue({ ok: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getModelToken(Category.name),
          useValue: MockModel,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    mockCategoryModel = module.get(getModelToken(Category.name));
    jest.clearAllMocks();

    // Restore chainable return values after clearAllMocks
    MockModel.findOne.mockReturnValue(createChain(null));
    MockModel.find.mockReturnValue(createChain([]));
    MockModel.findById.mockReturnValue(createChain(null));
    MockModel.findOneAndUpdate.mockReturnValue(createChain(null));
    MockModel.findOneAndDelete.mockReturnValue(createChain(null));
    (
      MockModel as unknown as { bulkWrite: jest.Mock }
    ).bulkWrite.mockResolvedValue({ ok: 1 });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a category and return it', async () => {
      const createDto: CreateCategoryDto = {
        color: '#FF5733',
        icon: 'wallet',
        name: 'Food & Dining',
        type: TransactionType.EXPENSE,
      };
      mockCategoryModel.findById.mockReturnValue(createChain(mockCategory));

      const result = await service.create(userId, createDto);

      expect(mockCategoryModel.findOne).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
        name: 'Food & Dining',
      });
      expect(saveMock).toHaveBeenCalled();
      expect(mockCategoryModel.findById).toHaveBeenCalledWith(categoryId);
      expect(result).toEqual(mockCategory);
    });

    it('should throw ConflictException when category name already exists', async () => {
      const createDto: CreateCategoryDto = {
        color: '#FF5733',
        icon: 'wallet',
        name: 'Food & Dining',
        type: TransactionType.EXPENSE,
      };
      mockCategoryModel.findOne.mockReturnValue(createChain(mockCategory));

      await expect(service.create(userId, createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(userId, createDto)).rejects.toThrow(
        'Category with this name already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of categories for the user', async () => {
      const list = [mockCategory];
      mockCategoryModel.find.mockReturnValue(createChain(list));

      const result = await service.findAll(userId);

      expect(mockCategoryModel.find).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(list);
    });
  });

  describe('findOne', () => {
    it('should return a category by id for the user', async () => {
      mockCategoryModel.findOne.mockReturnValue(createChain(mockCategory));

      const result = await service.findOne(userId, categoryId.toString());

      expect(mockCategoryModel.findOne).toHaveBeenCalledWith({
        _id: categoryId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(mockCategory);
    });

    it('should return null when category not found', async () => {
      mockCategoryModel.findOne.mockReturnValue(createChain(null));

      const result = await service.findOne(userId, 'invalid');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a category and return it', async () => {
      const updateDto: UpdateCategoryDto = { name: 'Updated Name' };
      const updated = { ...mockCategory, name: 'Updated Name' };
      mockCategoryModel.findOneAndUpdate.mockReturnValue(createChain(updated));

      const result = await service.update(
        userId,
        categoryId.toString(),
        updateDto,
      );

      expect(mockCategoryModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: categoryId.toString(),
          user: new Types.ObjectId(userId),
        },
        { name: 'Updated Name' },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockCategoryModel.findOneAndUpdate.mockReturnValue(createChain(null));

      await expect(
        service.update(userId, 'invalid', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new name already exists', async () => {
      const updateDto: UpdateCategoryDto = { name: 'Existing Name' };
      mockCategoryModel.findOne.mockReturnValue(
        createChain({ _id: 'other-id', name: 'Existing Name' }),
      );

      await expect(
        service.update(userId, categoryId.toString(), updateDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('reorder', () => {
    const categoryId2 = new Types.ObjectId('507f1f77bcf86cd799439013');
    const categoryId3 = new Types.ObjectId('507f1f77bcf86cd799439014');

    it('should update order for each category by index and return void', async () => {
      const ids = [categoryId.toString(), categoryId2.toString()];
      const foundCategories = [{ _id: categoryId }, { _id: categoryId2 }];
      const findChain = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(foundCategories),
      };
      mockCategoryModel.find.mockReturnValue(findChain);
      (
        mockCategoryModel as unknown as { bulkWrite: jest.Mock }
      ).bulkWrite.mockResolvedValue({ ok: 1 });

      await service.reorder(userId, ids);

      expect(mockCategoryModel.find).toHaveBeenCalledWith({
        _id: { $in: [categoryId, categoryId2] },
        user: new Types.ObjectId(userId),
      });
      expect(findChain.select).toHaveBeenCalledWith('_id');
      expect(
        (mockCategoryModel as unknown as { bulkWrite: jest.Mock }).bulkWrite,
      ).toHaveBeenCalledWith([
        {
          updateOne: {
            filter: { _id: categoryId, user: new Types.ObjectId(userId) },
            update: { $set: { order: 0 } },
          },
        },
        {
          updateOne: {
            filter: { _id: categoryId2, user: new Types.ObjectId(userId) },
            update: { $set: { order: 1 } },
          },
        },
      ]);
    });

    it('should throw NotFoundException when not all category ids belong to user', async () => {
      const ids = [categoryId.toString(), categoryId3.toString()];
      const foundCategories = [{ _id: categoryId }];
      const findChain = {
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(foundCategories),
      };
      mockCategoryModel.find.mockReturnValue(findChain);

      await expect(service.reorder(userId, ids)).rejects.toThrow(
        NotFoundException,
      );
      expect(
        (mockCategoryModel as unknown as { bulkWrite: jest.Mock }).bulkWrite,
      ).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a category and return true', async () => {
      mockCategoryModel.findOneAndDelete.mockReturnValue(
        createChain(mockCategory),
      );

      const result = await service.remove(userId, categoryId.toString());

      expect(mockCategoryModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: categoryId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(result).toBe(true);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockCategoryModel.findOneAndDelete.mockReturnValue(createChain(null));

      await expect(service.remove(userId, 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toCategoryDto', () => {
    it('should convert CategoryDocument to CategoryDto', () => {
      const dto = service.toCategoryDto(mockCategory);

      expect(dto).toEqual({
        id: mockCategory._id.toString(),
        color: mockCategory.color,
        icon: mockCategory.icon,
        name: mockCategory.name,
        type: (mockCategory as { type?: string }).type,
        order: (mockCategory as { order?: number }).order ?? 0,
        createdAt: mockCategory.createdAt.toISOString(),
        updatedAt: mockCategory.updatedAt.toISOString(),
      });
    });
  });
});
