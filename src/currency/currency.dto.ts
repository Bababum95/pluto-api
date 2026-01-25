import { IsString, IsNumber, IsEnum, IsArray, IsOptional } from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  code: string;

  @IsString()
  symbol: string;

  @IsString()
  name: string;

  @IsString()
  symbol_native: string;

  @IsNumber()
  decimal_digits: number;

  @IsNumber()
  rounding: number;

  @IsString()
  name_plural: string;

  @IsEnum(['fiat', 'crypto'])
  type: string;

  @IsArray()
  @IsString({ each: true })
  countries: string[];
}

export class UpdateCurrencyDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  symbol_native?: string;

  @IsOptional()
  @IsNumber()
  decimal_digits?: number;

  @IsOptional()
  @IsNumber()
  rounding?: number;

  @IsOptional()
  @IsString()
  name_plural?: string;

  @IsOptional()
  @IsEnum(['fiat', 'crypto'])
  type?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  countries?: string[];
}