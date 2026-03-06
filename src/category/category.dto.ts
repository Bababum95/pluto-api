import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsArray,
  ArrayMinSize,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';

import { TransactionType } from '../transaction/transaction.enum';

export class CreateCategoryDto {
  @ApiProperty({
    example: '#FF5733',
    description: 'Category color in hex format',
  })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ example: 'wallet', description: 'Icon name as string' })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiProperty({ example: 'Food & Dining', minLength: 1, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'expense', description: 'Transaction type' })
  @IsString()
  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class ReorderCategoriesDto {
  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Category IDs in the desired order (index = display order)',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  ids: string[];
}

export class CategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: '#FF5733' })
  color: string;

  @ApiProperty({ example: 'wallet' })
  icon: string;

  @ApiProperty({ example: 'Food & Dining' })
  name: string;

  @ApiProperty({ example: 'expense' })
  type: TransactionType;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  updatedAt: string;
}
