import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';

import { UsersService } from '../user/users.service.js';
import { AuthService } from '../auth/auth.service.js';
import { UserDecorator } from '../auth/user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import type { RequestUser } from '../auth/auth.dto.js';

import { PasskeyService } from './passkey.service.js';
import {
  PasskeyLoginOptionsDto,
  VerifyRegistrationDto,
  VerifyLoginDto,
  PasskeyListDto,
  PasskeyItemDto,
  AuthResponseDto,
} from './passkey.dto.js';

@ApiTags('auth')
@Controller('auth/webauthn')
export class PasskeyController {
  constructor(
    private readonly passkeyService: PasskeyService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  // ─── Registration (requires JWT) ─────────────────────────────────────────────

  @Get('register-options')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Generate WebAuthn registration options for the authenticated user',
  })
  @ApiOkResponse({ description: 'PublicKeyCredentialCreationOptionsJSON' })
  async registerOptions(@UserDecorator() user: RequestUser) {
    const fullUser = await this.usersService.findOne(user.userId);
    if (!fullUser) {
      throw new UnauthorizedException();
    }
    return this.passkeyService.generateRegistrationOptions(
      user.userId,
      fullUser.email,
      fullUser.name,
    );
  }

  @Post('verify-registration')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Verify and save WebAuthn registration credential' })
  @ApiOkResponse({ type: PasskeyItemDto })
  async verifyRegistration(
    @UserDecorator() user: RequestUser,
    @Body() body: VerifyRegistrationDto,
  ): Promise<PasskeyItemDto> {
    const credential = JSON.parse(body.credential) as RegistrationResponseJSON;
    const passkey = await this.passkeyService.verifyRegistration(
      user.userId,
      credential,
      body.deviceName,
    );
    return this.passkeyService.toPasskeyItemDto(passkey);
  }

  // ─── Authentication (public) ─────────────────────────────────────────────────

  @Public()
  @Post('login-options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Generate WebAuthn authentication options. Omit email for conditional UI (discoverable credentials)',
  })
  @ApiOkResponse({ description: 'PublicKeyCredentialRequestOptionsJSON' })
  @ApiResponse({
    status: 404,
    description: 'User not found or has no passkeys',
  })
  async loginOptions(@Body() body: PasskeyLoginOptionsDto) {
    if (!body.email) {
      // Conditional UI (autofill) — return challenge without allowCredentials
      return this.passkeyService.generateDiscoverableAuthenticationOptions();
    }
    const user = await this.usersService.findByEmail(body.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const count = await this.passkeyService.countByUserId(user._id.toString());
    if (count === 0) {
      throw new NotFoundException('No passkeys registered for this user');
    }
    return this.passkeyService.generateAuthenticationOptions(
      user._id.toString(),
    );
  }

  @Public()
  @Post('verify-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify WebAuthn authentication and return JWT' })
  @ApiOkResponse({ type: AuthResponseDto })
  async verifyLogin(@Body() body: VerifyLoginDto): Promise<AuthResponseDto> {
    const credential = JSON.parse(
      body.credential,
    ) as AuthenticationResponseJSON;

    // Resolve userId from credentialId (unique per credential)
    const existingPasskey = await this.passkeyService.findByCredentialId(
      credential.id,
    );
    if (!existingPasskey) {
      throw new NotFoundException('Passkey not found');
    }

    const userId = existingPasskey.userId.toString();
    const passkey = await this.passkeyService.verifyAuthentication(
      userId,
      credential,
    );

    const user = await this.usersService.findOne(passkey.userId.toString());
    if (!user) {
      throw new UnauthorizedException();
    }

    const accessToken = this.authService.createAccessToken(user);
    return {
      user: this.usersService.toUserDto(user),
      accessToken,
    };
  }

  // ─── Passkey management (requires JWT) ───────────────────────────────────────

  @Get('passkeys')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all passkeys for the authenticated user' })
  @ApiOkResponse({ type: PasskeyListDto })
  async listPasskeys(
    @UserDecorator() user: RequestUser,
  ): Promise<PasskeyListDto> {
    const passkeys = await this.passkeyService.findByUserId(user.userId);
    return {
      passkeys: passkeys.map((p) => this.passkeyService.toPasskeyItemDto(p)),
    };
  }

  @Delete('passkeys/:id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a passkey by ID' })
  @ApiResponse({ status: 204, description: 'Passkey deleted' })
  @ApiResponse({ status: 404, description: 'Passkey not found' })
  async deletePasskey(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.passkeyService.deleteById(id, user.userId);
  }
}
