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
import { CurrencyService } from './currency.service';
import { CreateCurrencyDto, UpdateCurrencyDto } from './currency.dto';

@ApiTags('currencies')
@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new currency' })
  @ApiResponse({
    status: 201,
    description: 'The currency has been successfully created.',
  })
  create(@Body() createCurrencyDto: CreateCurrencyDto) {
    return this.currencyService.create(createCurrencyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all currencies' })
  @ApiResponse({ status: 200, description: 'List of all currencies.' })
  findAll() {
    return this.currencyService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a currency by ID' })
  @ApiResponse({ status: 200, description: 'The currency.' })
  @ApiResponse({ status: 404, description: 'Currency not found.' })
  findOne(@Param('id') id: string) {
    return this.currencyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a currency by ID' })
  @ApiResponse({
    status: 200,
    description: 'The currency has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Currency not found.' })
  update(
    @Param('id') id: string,
    @Body() updateCurrencyDto: UpdateCurrencyDto,
  ) {
    return this.currencyService.update(id, updateCurrencyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a currency by ID' })
  @ApiResponse({
    status: 200,
    description: 'The currency has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Currency not found.' })
  remove(@Param('id') id: string) {
    return this.currencyService.remove(id);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync currencies from external API' })
  @ApiResponse({
    status: 200,
    description: 'Currencies have been successfully synced.',
  })
  @ApiResponse({ status: 500, description: 'Failed to sync currencies.' })
  sync() {
    return this.currencyService.sync();
  }
}
