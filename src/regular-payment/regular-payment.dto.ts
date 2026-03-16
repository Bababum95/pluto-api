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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

import { AccountDto } from '../account/account.dto';
import { CategoryDto } from '../category/category.dto';
import { TagDto } from '../tag/tag.dto';
import { MoneyViewDto } from '../money/money.dto';

import { TransactionType } from '../transaction/transaction.enum';

/** Regular payment amount view: original (account currency) and converted. */
export class RegularPaymentAmountViewDto {
  @ApiProperty({
    type: MoneyViewDto,
    description: 'Amount in account currency',
  })
  original: MoneyViewDto;

  @ApiProperty({
    type: MoneyViewDto,
    description: 'Amount in converted (e.g. base) currency',
  })
  converted: MoneyViewDto;
}

export class CreateRegularPaymentDto {
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

  @ApiPropertyOptional({
    example: 'Monthly rent',
    maxLength: 500,
  })
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

  @ApiPropertyOptional({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
    description: 'Tag IDs',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  tags?: string[];
}

export class UpdateRegularPaymentDto extends PartialType(
  CreateRegularPaymentDto,
) {}

export class RegularPaymentDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Account data', type: AccountDto })
  account: AccountDto;

  @ApiProperty({ example: 'expense', enum: TransactionType })
  type: TransactionType;

  @ApiProperty({ description: 'Category data', type: CategoryDto })
  category: CategoryDto;

  @ApiProperty({ example: 'Monthly rent' })
  comment: string;

  @ApiProperty({
    type: RegularPaymentAmountViewDto,
    description: 'Amount: original (account currency) and converted',
  })
  amount: RegularPaymentAmountViewDto;

  @ApiProperty({
    type: [TagDto],
    description: 'Tag entities attached to the regular payment',
  })
  tags: TagDto[];

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  updatedAt: string;
}
