import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';

export class CreateRateDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  value: number;
}

export class UpdateRateDto extends PartialType(CreateRateDto) {}
