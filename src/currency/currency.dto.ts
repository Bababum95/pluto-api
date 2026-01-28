import {
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

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
