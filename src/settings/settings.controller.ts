import { Controller, Get, Patch, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { SettingsService } from './settings.service';
import { UpdateSettingsDto, SettingsDto } from './settings.dto';
import { UserDecorator } from '../auth/user.decorator';
import type { RequestUser } from '../auth/auth.dto';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user settings' })
  @ApiResponse({
    status: 200,
    description: 'User settings (one per user).',
    type: SettingsDto,
  })
  @ApiResponse({ status: 404, description: 'Settings not found.' })
  async findOne(@UserDecorator() user: RequestUser): Promise<SettingsDto> {
    const settings = await this.settingsService.findOneOrFail(user.userId);
    return this.settingsService.toSettingsDto(settings);
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated.',
    type: SettingsDto,
  })
  @ApiResponse({ status: 404, description: 'Settings not found.' })
  @ApiResponse({ status: 400, description: 'Invalid currency or account.' })
  async update(
    @UserDecorator() user: RequestUser,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ): Promise<SettingsDto> {
    const settings = await this.settingsService.update(
      user.userId,
      updateSettingsDto,
    );
    return this.settingsService.toSettingsDto(settings);
  }
}
