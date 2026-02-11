import { IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { CurrencyDto } from '../currency/currency.dto';
import { AccountDto } from '../account/account.dto';

export class UpdateSettingsDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Currency ID (MongoDB ObjectId)',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  currency?: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Default account ID (MongoDB ObjectId), null to clear',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsMongoId()
  account?: string | null;
}

export class SettingsDto {
  @ApiProperty({ description: 'Settings document ID' })
  id: string;

  @ApiProperty({ type: CurrencyDto, description: 'Default currency' })
  currency: CurrencyDto;

  @ApiProperty({
    type: AccountDto,
    nullable: true,
    description: 'Default account (null if not set)',
  })
  account: AccountDto | null;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  updatedAt: string;
}
