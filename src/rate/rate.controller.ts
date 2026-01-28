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
import { CreateRateDto, UpdateRateDto } from './rate.dto';

@ApiTags('rates')
@Controller('rates')
export class RateController {
  constructor(private readonly rateService: RateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new rate' })
  @ApiResponse({
    status: 201,
    description: 'The rate has been successfully created.',
  })
  create(@Body() createRateDto: CreateRateDto) {
    return this.rateService.create(createRateDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rates' })
  @ApiResponse({ status: 200, description: 'List of all rates.' })
  findAll() {
    return this.rateService.getLatestValidRate();
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get a rate by currency code' })
  @ApiResponse({ status: 200, description: 'The rate.' })
  @ApiResponse({ status: 404, description: 'Rate not found.' })
  findByCode(@Param('code') code: string) {
    return this.rateService.findByCode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rate by ID' })
  @ApiResponse({ status: 200, description: 'The rate.' })
  @ApiResponse({ status: 404, description: 'Rate not found.' })
  findOne(@Param('id') id: string) {
    return this.rateService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rate by ID' })
  @ApiResponse({
    status: 200,
    description: 'The rate has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Rate not found.' })
  update(@Param('id') id: string, @Body() updateRateDto: UpdateRateDto) {
    return this.rateService.update(id, updateRateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a rate by ID' })
  @ApiResponse({
    status: 200,
    description: 'The rate has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Rate not found.' })
  remove(@Param('id') id: string) {
    return this.rateService.remove(id);
  }
}
