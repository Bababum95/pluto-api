import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { RateService } from './rate.service';
import { CreateRateDto, UpdateRateDto, RateDto } from './rate.dto';

@ApiTags('rates')
@Controller('rates')
export class RateController {
  constructor(private readonly rateService: RateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new rate' })
  @ApiResponse({
    status: 201,
    description: 'The rate has been successfully created.',
    type: RateDto,
  })
  async create(@Body() createRateDto: CreateRateDto): Promise<RateDto> {
    const rate = await this.rateService.create(createRateDto);
    return this.rateService.toRateDto(rate);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rates' })
  @ApiResponse({
    status: 200,
    description: 'List of all rates.',
    type: [RateDto],
  })
  async findAll(): Promise<RateDto[]> {
    const rates = await this.rateService.getLatestValidRate();
    return rates.map((rate) => this.rateService.toRateDto(rate));
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get a rate by currency code' })
  @ApiResponse({ status: 200, description: 'The rate.', type: RateDto })
  @ApiResponse({ status: 404, description: 'Rate not found.' })
  async findByCode(@Param('code') code: string): Promise<RateDto> {
    const rate = await this.rateService.findByCode(code);
    return this.rateService.toRateDto(rate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rate by ID' })
  @ApiResponse({ status: 200, description: 'The rate.', type: RateDto })
  @ApiResponse({ status: 404, description: 'Rate not found.' })
  async findOne(@Param('id') id: string): Promise<RateDto> {
    const rate = await this.rateService.findOne(id);
    return this.rateService.toRateDto(rate);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rate by ID' })
  @ApiResponse({
    status: 200,
    description: 'The rate has been successfully updated.',
    type: RateDto,
  })
  @ApiResponse({ status: 404, description: 'Rate not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateRateDto: UpdateRateDto,
  ): Promise<RateDto> {
    const rate = await this.rateService.update(id, updateRateDto);
    return this.rateService.toRateDto(rate);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a rate by ID' })
  @ApiResponse({
    status: 200,
    description: 'The rate has been successfully deleted.',
    type: RateDto,
  })
  @ApiResponse({ status: 404, description: 'Rate not found.' })
  async remove(@Param('id') id: string): Promise<RateDto> {
    const rate = await this.rateService.remove(id);
    return this.rateService.toRateDto(rate);
  }
}
