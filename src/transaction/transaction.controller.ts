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

import { TransactionService } from './transaction.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionDto,
} from './transaction.dto';
import { UserDecorator } from '../auth/user.decorator';
import type { RequestUser } from '../auth/auth.dto';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({
    status: 201,
    description: 'The transaction has been successfully created.',
    type: TransactionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Category or account not found.',
  })
  async create(
    @UserDecorator() user: RequestUser,
    @Body() createTransactionDto: CreateTransactionDto,
  ): Promise<TransactionDto> {
    const transaction = await this.transactionService.create(
      user.userId,
      createTransactionDto,
    );
    return this.transactionService.toTransactionDto(transaction);
  }

  @Get()
  @ApiOperation({ summary: 'Get all transactions for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of all transactions for the current user.',
    type: [TransactionDto],
  })
  async findAll(@UserDecorator() user: RequestUser): Promise<TransactionDto[]> {
    const transactions = await this.transactionService.findAll(user.userId);
    return transactions.map((t) => this.transactionService.toTransactionDto(t));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'The transaction.',
    type: TransactionDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  async findOne(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<TransactionDto> {
    const transaction = await this.transactionService.findOne(user.userId, id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return this.transactionService.toTransactionDto(transaction);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'The transaction has been successfully updated.',
    type: TransactionDto,
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  @ApiResponse({ status: 400, description: 'Category or account not found.' })
  async update(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ): Promise<TransactionDto> {
    const transaction = await this.transactionService.update(
      user.userId,
      id,
      updateTransactionDto,
    );
    return this.transactionService.toTransactionDto(transaction);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transaction by ID' })
  @ApiResponse({
    status: 204,
    description: 'The transaction has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  async remove(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.transactionService.remove(user.userId, id);
  }
}
