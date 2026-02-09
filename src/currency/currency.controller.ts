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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { CurrencyService } from './currency.service';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CurrencyDto,
} from './currency.dto';

@ApiTags('currencies')
@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new currency' })
  @ApiResponse({
    status: 201,
    description: 'The currency has been successfully created.',
    type: CurrencyDto,
  })
  async create(
    @Body() createCurrencyDto: CreateCurrencyDto,
  ): Promise<CurrencyDto> {
    const currency = await this.currencyService.create(createCurrencyDto);
    return this.currencyService.toCurrencyDto(currency);
  }

  @Get()
  @ApiOperation({ summary: 'Get all currencies' })
  @ApiResponse({
    status: 200,
    description: 'List of all currencies.',
    type: [CurrencyDto],
  })
  async findAll(): Promise<CurrencyDto[]> {
    const currencies = await this.currencyService.findAll();
    return currencies.map((currency) =>
      this.currencyService.toCurrencyDto(currency),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a currency by ID' })
  @ApiResponse({
    status: 200,
    description: 'The currency.',
    type: CurrencyDto,
  })
  @ApiResponse({ status: 404, description: 'Currency not found.' })
  async findOne(@Param('id') id: string): Promise<CurrencyDto> {
    const currency = await this.currencyService.findOne(id);
    return this.currencyService.toCurrencyDto(currency);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a currency by ID' })
  @ApiResponse({
    status: 200,
    description: 'The currency has been successfully updated.',
    type: CurrencyDto,
  })
  @ApiResponse({ status: 404, description: 'Currency not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateCurrencyDto: UpdateCurrencyDto,
  ): Promise<CurrencyDto> {
    const currency = await this.currencyService.update(id, updateCurrencyDto);
    return this.currencyService.toCurrencyDto(currency);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a currency by ID' })
  @ApiResponse({
    status: 204,
    description: 'The currency has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Currency not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.currencyService.remove(id);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync currencies from external API' })
  @ApiResponse({
    status: 200,
    description: 'Currencies have been successfully synced.',
  })
  @ApiResponse({ status: 500, description: 'Failed to sync currencies.' })
  async sync(): Promise<void> {
    await this.currencyService.sync();
  }
}
