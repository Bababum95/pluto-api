import {
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

import { CurrencyType } from './currency.types';

export class CreateCurrencyDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  symbol_native: string;

  @Type(() => Number)
  @IsNumber()
  decimal_digits: number;

  @Type(() => Number)
  @IsNumber()
  rounding: number;

  @IsString()
  name_plural: string;

  @IsEnum(CurrencyType)
  type: CurrencyType;

  @IsArray()
  @IsString({ each: true })
  countries: string[];
}

export class UpdateCurrencyDto extends PartialType(CreateCurrencyDto) {}

export class CurrencyDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'USD' })
  code: string;

  @ApiProperty({ example: '$' })
  symbol: string;

  @ApiProperty({ example: 'US Dollar' })
  name: string;

  @ApiProperty({ example: '$' })
  symbol_native: string;

  @ApiProperty({ example: 2 })
  decimal_digits: number;

  @ApiProperty({ example: 0 })
  rounding: number;

  @ApiProperty({ example: 'US dollars' })
  name_plural: string;

  @ApiProperty({ example: 'fiat', enum: ['fiat', 'crypto'] })
  type: string;
}
