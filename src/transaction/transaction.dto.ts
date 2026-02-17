import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsOptional,
  IsArray,
  MinLength,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

import { AccountDto, AccountSummaryDto } from '../account/account.dto';
import { CategoryDto } from '../category/category.dto';
import { MoneyViewDto } from '../money/money.dto';

import { TransactionType } from './transaction.enum';

/** Transaction amount: original (account currency) and converted (e.g. user/base currency). */
export class TransactionAmountViewDto {
  @ApiProperty({
    type: MoneyViewDto,
    description: 'Amount in transaction (account) currency',
  })
  original: MoneyViewDto;

  @ApiProperty({
    type: MoneyViewDto,
    description: 'Amount in converted (e.g. base) currency',
  })
  converted: MoneyViewDto;
}

/** Optional query filters for listing transactions. Any combination is allowed. */
export class TransactionFilterDto {
  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Start of period (inclusive). ISO date or datetime.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'End of period (inclusive). ISO date or datetime.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 'expense', enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Filter by category ID.',
  })
  @IsOptional()
  @IsMongoId()
  category?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439012',
    description: 'Filter by account ID.',
  })
  @IsOptional()
  @IsMongoId()
  account?: string;
}

export class CreateTransactionDto {
  @ApiProperty({ example: 'expense', enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Category ID',
  })
  @IsMongoId()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Lunch at cafe', maxLength: 500, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Account ID',
  })
  @IsMongoId()
  @IsNotEmpty()
  account: string;

  @ApiProperty({
    example: -1500.5,
    description: 'Amount (decimal). Negative for expense, positive for income.',
  })
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 2,
    description: 'Decimal places (scale)',
    minimum: 0,
    maximum: 18,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(18)
  scale: number;

  @ApiProperty({
    example: ['food', 'restaurant'],
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  tags?: string[];
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}

export class TransactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'expense', enum: TransactionType })
  type: TransactionType;

  @ApiProperty({ description: 'Category data', type: CategoryDto })
  category: CategoryDto;

  @ApiProperty({ example: 'Lunch at cafe' })
  comment: string;

  @ApiProperty({
    type: TransactionAmountViewDto,
    description: 'Amount: original (account currency) and converted',
  })
  amount: TransactionAmountViewDto;

  @ApiProperty({ example: ['food', 'restaurant'] })
  tags: string[];

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  updatedAt: string;
}

export type CreateTransactionResponseDto = {
  transaction: TransactionDto;
  account: AccountDto;
  summary: AccountSummaryDto;
};
