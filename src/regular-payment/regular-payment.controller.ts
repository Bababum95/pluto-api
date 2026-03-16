import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { RegularPaymentService } from './regular-payment.service';
import { SettingsService } from '../settings/settings.service';
import { RateService } from '../rate/rate.service';
import {
  CreateRegularPaymentDto,
  UpdateRegularPaymentDto,
  RegularPaymentDto,
} from './regular-payment.dto';
import { UserDecorator } from '../auth/user.decorator';
import type { RequestUser } from '../auth/auth.dto';

@ApiTags('regular-payments')
@ApiBearerAuth()
@Controller('regular-payments')
export class RegularPaymentController {
  constructor(
    private readonly regularPaymentService: RegularPaymentService,
    private readonly settingsService: SettingsService,
    private readonly rateService: RateService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new regular payment template' })
  @ApiResponse({
    status: 201,
    description: 'The regular payment has been successfully created.',
    type: RegularPaymentDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Category or account not found.',
  })
  async create(
    @UserDecorator() user: RequestUser,
    @Body() createDto: CreateRegularPaymentDto,
  ): Promise<RegularPaymentDto> {
    const payment = await this.regularPaymentService.create(
      user.userId,
      createDto,
    );
    const settings = await this.settingsService.findByUserId(user.userId);
    const rates = await this.rateService.getLatestValidRate();
    return this.regularPaymentService.toRegularPaymentDto(payment, {
      settings,
      rates,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'Get all regular payments for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all regular payment templates.',
    type: [RegularPaymentDto],
  })
  async findAll(
    @UserDecorator() user: RequestUser,
  ): Promise<RegularPaymentDto[]> {
    const list = await this.regularPaymentService.findAll(user.userId);
    const settings = await this.settingsService.findByUserId(user.userId);
    const rates = await this.rateService.getLatestValidRate();
    const options = { settings, rates };
    return list.map((p) =>
      this.regularPaymentService.toRegularPaymentDto(p, options),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a regular payment by ID' })
  @ApiResponse({
    status: 200,
    description: 'The regular payment.',
    type: RegularPaymentDto,
  })
  @ApiResponse({ status: 404, description: 'Regular payment not found.' })
  async findOne(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<RegularPaymentDto> {
    const payment = await this.regularPaymentService.findOne(user.userId, id);
    if (!payment) {
      throw new NotFoundException('Regular payment not found');
    }
    const settings = await this.settingsService.findByUserId(user.userId);
    const rates = await this.rateService.getLatestValidRate();
    return this.regularPaymentService.toRegularPaymentDto(payment, {
      settings,
      rates,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a regular payment by ID' })
  @ApiResponse({
    status: 200,
    description: 'The regular payment has been successfully updated.',
    type: RegularPaymentDto,
  })
  @ApiResponse({ status: 404, description: 'Regular payment not found.' })
  @ApiResponse({ status: 400, description: 'Category or account not found.' })
  async update(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateRegularPaymentDto,
  ): Promise<RegularPaymentDto> {
    const payment = await this.regularPaymentService.update(
      user.userId,
      id,
      updateDto,
    );
    const settings = await this.settingsService.findByUserId(user.userId);
    const rates = await this.rateService.getLatestValidRate();
    return this.regularPaymentService.toRegularPaymentDto(payment, {
      settings,
      rates,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a regular payment by ID' })
  @ApiResponse({
    status: 204,
    description: 'The regular payment has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Regular payment not found.' })
  async remove(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.regularPaymentService.remove(user.userId, id);
  }
}
