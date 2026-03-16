import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UserDecorator } from '../auth/user.decorator';
import type { RequestUser } from '../auth/auth.dto';

import {
  CreateTransferDto,
  TransferDto,
  UpdateTransferDto,
  TransferFilterDto,
} from './transfer.dto';
import { TransferService } from './transfer.service';

@ApiTags('transfers')
@ApiBearerAuth()
@Controller('transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new account-to-account transfer' })
  @ApiResponse({
    status: 201,
    description: 'The transfer has been successfully created.',
    type: TransferDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @UserDecorator() user: RequestUser,
    @Body() createTransferDto: CreateTransferDto,
  ): Promise<TransferDto> {
    const transfer = await this.transferService.create(
      user.userId,
      createTransferDto,
    );
    return this.transferService.toTransferDto(transfer);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transfers for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of all transfers for the current user.',
    type: [TransferDto],
  })
  async findAll(
    @UserDecorator() user: RequestUser,
    @Query() filters?: TransferFilterDto,
  ): Promise<TransferDto[]> {
    const transfers = await this.transferService.findAll(user.userId, filters);
    return transfers.map((transfer) =>
      this.transferService.toTransferDto(transfer),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transfer by ID' })
  @ApiResponse({
    status: 200,
    description: 'The transfer.',
    type: TransferDto,
  })
  @ApiResponse({ status: 404, description: 'Transfer not found.' })
  async findOne(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<TransferDto> {
    const transfer = await this.transferService.findOne(user.userId, id);
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }
    return this.transferService.toTransferDto(transfer);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transfer by ID' })
  @ApiResponse({
    status: 200,
    description: 'The transfer has been successfully updated.',
    type: TransferDto,
  })
  @ApiResponse({ status: 404, description: 'Transfer not found.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async update(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
    @Body() updateTransferDto: UpdateTransferDto,
  ): Promise<TransferDto> {
    const transfer = await this.transferService.update(
      user.userId,
      id,
      updateTransferDto,
    );
    return this.transferService.toTransferDto(transfer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transfer by ID' })
  @ApiResponse({
    status: 204,
    description: 'The transfer has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Transfer not found.' })
  async remove(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.transferService.remove(user.userId, id);
  }
}
