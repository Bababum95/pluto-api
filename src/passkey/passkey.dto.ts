import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

import { AuthResponseDto } from '../auth/auth.dto.js';

export class PasskeyLoginOptionsDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'Omit for conditional UI (discoverable credentials)',
  })
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class VerifyRegistrationDto {
  @ApiProperty({
    description:
      'Stringified RegistrationResponseJSON from @simplewebauthn/browser',
  })
  @IsString()
  @IsNotEmpty()
  credential: string;

  @ApiPropertyOptional({
    description: 'Optional device name for display',
    example: 'iPhone 15',
  })
  @IsString()
  @IsOptional()
  deviceName?: string;
}

export class VerifyLoginDto {
  @ApiProperty({
    description:
      'Stringified AuthenticationResponseJSON from @simplewebauthn/browser',
  })
  @IsString()
  @IsNotEmpty()
  credential: string;
}

export class PasskeyItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  deviceName: string;

  @ApiProperty()
  deviceType: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  lastUsedAt: string | null;
}

export class PasskeyListDto {
  @ApiProperty({ type: [PasskeyItemDto] })
  passkeys: PasskeyItemDto[];
}

export { AuthResponseDto };
