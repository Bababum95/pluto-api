import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { I18n, I18nContext } from 'nestjs-i18n';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CategoryService } from './category.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryDto,
  ReorderCategoriesDto,
} from './category.dto';
import { UserDecorator } from '../auth/user.decorator';
import type { RequestUser } from '../auth/auth.dto';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: 201,
    description: 'The category has been successfully created.',
    type: CategoryDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 409, description: 'Category name already exists.' })
  async create(
    @UserDecorator() user: RequestUser,
    @Body() createCategoryDto: CreateCategoryDto,
  ): Promise<CategoryDto> {
    const category = await this.categoryService.create(
      user.userId,
      createCategoryDto,
    );
    return this.categoryService.toCategoryDto(category);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of all categories for the current user.',
    type: [CategoryDto],
  })
  async findAll(@UserDecorator() user: RequestUser): Promise<CategoryDto[]> {
    const categories = await this.categoryService.findAll(user.userId);
    return categories.map((category, index) => {
      return this.categoryService.toCategoryDto(category, index);
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiResponse({
    status: 200,
    description: 'The category.',
    type: CategoryDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async findOne(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<CategoryDto> {
    const category = await this.categoryService.findOne(user.userId, id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.categoryService.toCategoryDto(category);
  }

  @Patch('reorder')
  @ApiOperation({
    summary:
      'Reorder categories by providing list of category IDs (index = order)',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories have been reordered.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'One or more categories not found.',
  })
  async reorder(
    @UserDecorator() user: RequestUser,
    @Body() body: ReorderCategoriesDto,
    @I18n() i18n: I18nContext,
  ): Promise<{ status: number; message: string }> {
    const { ids } = body;
    await this.categoryService.reorder(user.userId, ids);
    return {
      status: HttpStatus.OK,
      message: i18n.t('category.reorder.success', {
        defaultValue: 'Categories have been reordered.',
      }),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category by ID' })
  @ApiResponse({
    status: 200,
    description: 'The category has been successfully updated.',
    type: CategoryDto,
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  @ApiResponse({ status: 409, description: 'Category name already exists.' })
  async update(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    const category = await this.categoryService.update(
      user.userId,
      id,
      updateCategoryDto,
    );
    return this.categoryService.toCategoryDto(category);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category by ID' })
  @ApiResponse({
    status: 204,
    description: 'The category has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async remove(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.categoryService.remove(user.userId, id);
  }
}
