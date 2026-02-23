import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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

/**
 * Normalized API response for a single rate (id as string, dates as ISO strings).
 */
export class RateDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'USD' })
  code: string;

  @ApiProperty({ example: 1 })
  value: number;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  updatedAt: string;
}
