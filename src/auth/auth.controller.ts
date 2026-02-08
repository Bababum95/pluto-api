import {
  Controller,
  Post,
  Body,
  Get,
  UnauthorizedException,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';
import type { Response } from 'express';

import { UsersService } from '../user/users.service';
import { UserDto } from '../user/users.dto';

import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
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
  @ApiOkResponse({ type: UserDto })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user and set JWT access token in HTTP-only cookie',
  })
  @ApiResponse({
    status: 201,
    description:
      'User registered and logged in. JWT token set in HTTP-only cookie.',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists.',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    const user = await this.authService.register(registerDto);
    this.authService.attachAuthCookie(res, user);
    return this.usersService.toUserDto(user);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserDto })
  @ApiOperation({
    summary:
      'Login with email and password and set JWT access token in HTTP-only cookie',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. JWT token set in HTTP-only cookie.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @I18n() i18n: I18nContext,
  ): Promise<UserDto> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException(
        i18n.t('auth.login.errors.invalidCredentials'),
      );
    }

    this.authService.attachAuthCookie(res, user);

    return this.usersService.toUserDto(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Logout user and clear access token cookie' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful. Access token cookie cleared.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  logout(
    @Res({ passthrough: true }) res: Response,
    @I18n() i18n: I18nContext,
  ): { message: string } {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
    return { message: i18n.t('auth.logout.success') };
  }

  @Get('me')
  @ApiOkResponse({ type: UserDto })
  @ApiCookieAuth()
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
