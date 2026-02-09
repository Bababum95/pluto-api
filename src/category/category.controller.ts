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
    return categories.map((category) =>
      this.categoryService.toCategoryDto(category),
    );
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
