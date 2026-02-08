import {
  Controller,
  Post,
  Body,
  Get,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';

import { UsersService } from '../user/users.service';
import { UserDto } from '../user/users.dto';

import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './auth.dto';
import { UserDecorator } from './user.decorator';
import { Public } from './public.decorator';
import type { RequestUser } from './auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  @ApiOkResponse({ type: AuthResponseDto })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Register a new user; returns user and Bearer token (store token, send in Authorization header).',
  })
  @ApiResponse({
    status: 201,
    description:
      'User registered and logged in. Response includes accessToken.',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists.',
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.authService.register(registerDto);
    const accessToken = this.authService.createAccessToken(user);
    return {
      user: this.usersService.toUserDto(user),
      accessToken,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiOperation({
    summary:
      'Login with email and password; returns user and Bearer token (store token, send in Authorization header).',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Response includes accessToken.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(
    @Body() loginDto: LoginDto,
    @I18n() i18n: I18nContext,
  ): Promise<AuthResponseDto> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException(
        i18n.t('auth.login.errors.invalidCredentials'),
      );
    }
    const accessToken = this.authService.createAccessToken(user);
    return {
      user: this.usersService.toUserDto(user),
      accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user (client should clear stored token).' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  logout(@I18n() i18n: I18nContext): { message: string } {
    return { message: i18n.t('auth.logout.success') };
  }

  @Get('me')
  @ApiOkResponse({ type: UserDto })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getProfile(@UserDecorator() user: RequestUser): Promise<UserDto> {
    const fullUser = await this.usersService.findOne(user.userId);
    if (!fullUser) {
      throw new UnauthorizedException();
    }
    return this.usersService.toUserDto(fullUser);
  }
}
