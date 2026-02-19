import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsMongoId,
  IsBoolean,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

import { CurrencyDto } from '../currency/currency.dto';
import { MoneyViewDto } from '../money/money.dto';

export class CreateAccountDto {
  @ApiProperty({
    example: '#FF5733',
    description: 'Account color in hex format',
  })
  @IsString()
  @IsNotEmpty()
  color: string;

  @ApiProperty({ example: 'wallet', description: 'Icon name as string' })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiProperty({ example: 'Main Wallet', minLength: 1, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'Personal spending account',
    description: 'Optional account description',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: 1000.5,
    description: 'Account balance (will be stored in minor units)',
    default: 0,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  balance?: number;

  @ApiProperty({
    example: 2,
    description: 'Number of decimal places for the currency (scale)',
    minimum: 0,
    maximum: 18,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(18)
  scale: number;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Currency ID (MongoDB ObjectId)',
  })
  @IsMongoId()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    example: 1,
    description: 'Order for sorting accounts (auto-incremented per user)',
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({
    example: false,
    description: 'Whether the account is excluded from the total balance',
    required: false,
  })
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  excluded?: boolean;
}

export class UpdateAccountDto extends PartialType(CreateAccountDto) {}

export class ReorderAccountsDto {
  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'Account IDs in the desired order (index = display order)',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  ids: string[];
}

export class AccountBalanceViewDto {
  @ApiProperty({
    type: MoneyViewDto,
    description: 'Balance in account currency',
  })
  original: MoneyViewDto;

  @ApiProperty({
    type: MoneyViewDto,
    description: 'Balance in converted (e.g. base) currency',
  })
  converted: MoneyViewDto;
}

export class AccountDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: '#FF5733' })
  color: string;

  @ApiProperty({ example: 'wallet' })
  icon: string;

  @ApiProperty({ example: 'Main Wallet' })
  name: string;

  @ApiProperty({
    example: 'Personal spending account',
    description: 'Optional account description',
    required: false,
  })
  description?: string;

  @ApiProperty({
    type: AccountBalanceViewDto,
    description: 'Balance: original (account currency) and converted',
  })
  balance: AccountBalanceViewDto;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({ example: false })
  excluded: boolean;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  updatedAt: string;
}

export class AccountSummaryDto {
  @ApiProperty({
    example: 154327,
    description: 'Total balance in minor units (e.g., cents for USD)',
  })
  total_raw: number;

  @ApiProperty({
    example: 2,
    description: 'Number of decimal places for the currency (scale)',
  })
  scale: number;

  @ApiProperty({
    example: 1543.27,
    description: 'Total balance in decimal format',
  })
  total: number;

  @ApiProperty({
    type: CurrencyDto,
    description: 'User currency for the total amount',
  })
  currency: CurrencyDto;
}

export type AccountListResponseDto = {
  list: AccountDto[];
  summary: AccountSummaryDto;
};

export type AccountWithSummaryResponseDto = {
  account: AccountDto;
  summary: AccountSummaryDto;
};
