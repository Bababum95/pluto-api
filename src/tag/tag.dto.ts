import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';

export class CreateTagDto {
  @ApiProperty({ example: 'food', minLength: 1, maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: '#6B7280',
    description: 'Tag color in hex format',
    default: '#6B7280',
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    example: 'tag',
    description: 'Icon name',
    default: 'tag',
  })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class UpdateTagDto extends PartialType(CreateTagDto) {}

export class TagDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'food' })
  name: string;

  @ApiProperty({ example: '#6B7280' })
  color: string;

  @ApiProperty({ example: 'tag' })
  icon: string;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2021-01-01T10:00:00.000Z' })
  updatedAt: string;
}
