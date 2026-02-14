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
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

import { TransactionType } from './transaction.enum';
import type { AccountDto, AccountSummaryDto } from '../account/account.dto';

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

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  category: string;

  @ApiProperty({ example: 'Lunch at cafe' })
  comment: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012' })
  account: string;

  @ApiProperty({ example: -1500.5, description: 'Amount in decimal form' })
  amount: number;

  @ApiProperty({ example: -150050, description: 'Amount in minor units' })
  amount_raw: number;

  @ApiProperty({ example: 2 })
  scale: number;

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
