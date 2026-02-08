import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { UserDto } from '../user/users.dto';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', minLength: 2, maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export type JwtPayload = {
  sub: string;
  email: string;
};

export type RequestUser = {
  userId: string;
  email: string;
};

/** Response for login/register: user + Bearer token (client stores token, sends in Authorization header). */
export class AuthResponseDto {
  @ApiProperty({ type: UserDto, description: 'User profile' })
  user: UserDto;

  @ApiProperty({
    description: 'JWT access token; send as Authorization: Bearer <token>',
  })
  accessToken: string;
}
