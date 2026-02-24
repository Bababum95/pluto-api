import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';

export class FeeDto {
  @ApiProperty({
    example: 50,
    description: 'Fee amount in smallest units',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({
    example: 2,
    description: 'Decimal places (scale) for fee',
    minimum: 0,
    maximum: 18,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(18)
  scale: number;
}

export class TransferSideDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Account ID',
  })
  @IsMongoId()
  account: string;

  @ApiProperty({
    example: 10000,
    description: 'Amount in account balance units',
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  value: number;

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
}

export class CreateTransferDto {
  @ApiProperty({
    type: TransferSideDto,
    description: 'Source side of transfer',
  })
  @ValidateNested()
  @Type(() => TransferSideDto)
  from: TransferSideDto;

  @ApiProperty({
    type: TransferSideDto,
    description: 'Destination side of transfer',
  })
  @ValidateNested()
  @Type(() => TransferSideDto)
  to: TransferSideDto;

  @ApiProperty({
    example: 0.91,
    description: 'Conversion rate from source to destination value',
  })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  rate: number;

  @ApiProperty({
    type: FeeDto,
    description:
      'Transfer fee (value + scale). Optional, defaults to { value: 0, scale: 0 }.',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FeeDto)
  fee?: FeeDto;
}

export class UpdateTransferDto extends PartialType(CreateTransferDto) {}

export class TransferDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: TransferSideDto })
  from: TransferSideDto;

  @ApiProperty({ type: TransferSideDto })
  to: TransferSideDto;

  @ApiProperty({ example: 0.91 })
  rate: number;

  @ApiProperty({ type: FeeDto, description: 'Transfer fee' })
  fee: FeeDto;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  updatedAt: string;
}
