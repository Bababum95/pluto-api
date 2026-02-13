import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { Category, CategoryDocument } from './category.schema';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryDto,
} from './category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    private readonly i18n: I18nService,
  ) {}

  async create(
    userId: string,
    createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryDocument> {
    // Check if category with same name already exists for this user
    const existing = await this.categoryModel
      .findOne({
        user: new Types.ObjectId(userId),
        name: createCategoryDto.name.trim(),
      })
      .exec();

    if (existing) {
      throw new ConflictException(
        this.i18n.t('category.errors.nameAlreadyExists', {
          defaultValue: 'Category with this name already exists',
        }),
      );
    }

    const category = new this.categoryModel({
      ...createCategoryDto,
      user: new Types.ObjectId(userId),
      name: createCategoryDto.name.trim(),
    });

    await category.save();
    const created = await this.categoryModel.findById(category._id).exec();
    if (!created) {
      throw new Error(
        this.i18n.t('category.create.failed', {
          defaultValue: 'Category creation failed',
        }),
      );
    }
    return created;
  }

  async findAll(userId: string): Promise<CategoryDocument[]> {
    return this.categoryModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findOne({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .exec();
  }

  async update(
    userId: string,
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryDocument> {
    // If name is being updated, check for conflicts
    if (updateCategoryDto.name) {
      const existing = await this.categoryModel
        .findOne({
          user: new Types.ObjectId(userId),
          name: updateCategoryDto.name.trim(),
          _id: { $ne: id },
        })
        .exec();

      if (existing) {
        throw new ConflictException(
          this.i18n.t('category.errors.nameAlreadyExists', {
            defaultValue: 'Category with this name already exists',
          }),
        );
      }
    }

    const updateData = updateCategoryDto.name
      ? { ...updateCategoryDto, name: updateCategoryDto.name.trim() }
      : updateCategoryDto;

    const category = await this.categoryModel
      .findOneAndUpdate(
        {
          _id: id,
          user: new Types.ObjectId(userId),
        },
        updateData,
        { new: true },
      )
      .exec();

    if (!category) {
      throw new NotFoundException(
        this.i18n.t('category.errors.notFound', {
          defaultValue: 'Category not found',
        }),
      );
    }

    return category;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const result = await this.categoryModel
      .findOneAndDelete({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .exec();

    if (!result) {
      throw new NotFoundException(
        this.i18n.t('category.errors.notFound', {
          defaultValue: 'Category not found',
        }),
      );
    }

    return true;
  }

  toCategoryDto(category: CategoryDocument): CategoryDto {
    return {
      id: category._id.toString(),
      color: category.color,
      icon: category.icon,
      name: category.name,
      type: category.type,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }
}
