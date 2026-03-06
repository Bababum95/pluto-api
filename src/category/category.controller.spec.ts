import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { TransactionType } from '../transaction/transaction.enum';
import type { RequestUser } from '../auth/auth.dto';

import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import type { CreateCategoryDto, UpdateCategoryDto } from './category.dto';

jest.mock('./category.service', () => ({
  CategoryService: jest.fn(),
}));

type MockedCategory = {
  _id: string;
  user: string;
  color: string;
  icon: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    reorder: jest.Mock;
    toCategoryDto: jest.Mock;
  };

  const mockUser: RequestUser = {
    userId: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
  };

  const mockCategory: MockedCategory = {
    _id: '507f1f77bcf86cd799439012',
    user: mockUser.userId,
    color: '#FF5733',
    icon: 'wallet',
    name: 'Food & Dining',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategoryDto = {
    id: mockCategory._id,
    color: mockCategory.color,
    icon: mockCategory.icon,
    name: mockCategory.name,
    createdAt: mockCategory.createdAt.toISOString(),
    updatedAt: mockCategory.updatedAt.toISOString(),
  };

  const mockCreateDto: CreateCategoryDto = {
    color: '#FF5733',
    icon: 'wallet',
    name: 'Food & Dining',
    type: TransactionType.EXPENSE,
  };

  const mockI18n = {
    t: (key: string): string =>
      key === 'category.reorder.success'
        ? 'Categories have been reordered.'
        : key,
  };

  beforeEach(async () => {
    const mockCategoryService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      reorder: jest.fn(),
      toCategoryDto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: mockCategoryService }],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get(CategoryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a category and return CategoryDto', async () => {
      service.create.mockResolvedValue(mockCategory);
      service.toCategoryDto.mockReturnValue(mockCategoryDto);

      const result = await controller.create(mockUser, mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(
        mockUser.userId,
        mockCreateDto,
      );
      expect(service.toCategoryDto).toHaveBeenCalledWith(mockCategory);
      expect(result).toEqual(mockCategoryDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of CategoryDto for the user', async () => {
      const list = [mockCategory];
      service.findAll.mockResolvedValue(list);
      service.toCategoryDto.mockReturnValue(mockCategoryDto);

      const result = await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.userId);
      expect(service.toCategoryDto).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockCategoryDto]);
    });
  });

  describe('findOne', () => {
    it('should return a CategoryDto by id', async () => {
      service.findOne.mockResolvedValue(mockCategory);
      service.toCategoryDto.mockReturnValue(mockCategoryDto);

      const result = await controller.findOne(mockUser, mockCategory._id);

      expect(service.findOne).toHaveBeenCalledWith(
        mockUser.userId,
        mockCategory._id,
      );
      expect(service.toCategoryDto).toHaveBeenCalledWith(mockCategory);
      expect(result).toEqual(mockCategoryDto);
    });

    it('should throw NotFoundException when category not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne(mockUser, 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reorder', () => {
    it('should reorder categories and return status and message', async () => {
      const ids = [mockCategory._id, '507f1f77bcf86cd799439013'];
      const body = { ids };
      service.reorder.mockResolvedValue(undefined);

      const result = await controller.reorder(
        mockUser,
        body,
        mockI18n as never,
      );

      expect(service.reorder).toHaveBeenCalledWith(mockUser.userId, ids);
      expect(result).toEqual({
        status: 200,
        message: 'Categories have been reordered.',
      });
    });

    it('should throw NotFoundException when one or more categories not found', async () => {
      const body = { ids: [mockCategory._id, '507f1f77bcf86cd799439099'] };
      service.reorder.mockRejectedValue(
        new NotFoundException('Category not found'),
      );

      await expect(
        controller.reorder(mockUser, body, mockI18n as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a category and return CategoryDto', async () => {
      const updateDto: UpdateCategoryDto = { name: 'Updated Name' };
      const updated = { ...mockCategory, name: 'Updated Name' };
      const updatedDto = { ...mockCategoryDto, name: 'Updated Name' };
      service.update.mockResolvedValue(updated);
      service.toCategoryDto.mockReturnValue(updatedDto);

      const result = await controller.update(
        mockUser,
        mockCategory._id,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockUser.userId,
        mockCategory._id,
        updateDto,
      );
      expect(service.toCategoryDto).toHaveBeenCalledWith(updated);
      expect(result).toEqual(updatedDto);
    });
  });

  describe('remove', () => {
    it('should remove a category and return void', async () => {
      service.remove.mockResolvedValue(true);

      await controller.remove(mockUser, mockCategory._id);

      expect(service.remove).toHaveBeenCalledWith(
        mockUser.userId,
        mockCategory._id,
      );
    });
  });
});
