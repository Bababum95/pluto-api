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
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

import { CurrencyDto } from '../currency/currency.dto';

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
}

export class UpdateAccountDto extends PartialType(CreateAccountDto) {}

export class AccountDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: '#FF5733' })
  color: string;

  @ApiProperty({ example: 'wallet' })
  icon: string;

  @ApiProperty({ example: 'Main Wallet' })
  name: string;

  @ApiProperty({ example: 1000.5 })
  balance: number; // Converted from minor units for API response

  @ApiProperty({ example: 2 })
  scale: number;

  @ApiProperty({ type: CurrencyDto })
  currency: CurrencyDto;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  updatedAt: string;
}
