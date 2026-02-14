import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
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
import { AccountService } from '../account/account.service';
import { SettingsService } from '../settings/settings.service';
import { RateService } from '../rate/rate.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionDto,
  CreateTransactionResponseDto,
  TransactionFilterDto,
} from './transaction.dto';
import { UserDecorator } from '../auth/user.decorator';
import type { RequestUser } from '../auth/auth.dto';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly accountService: AccountService,
    private readonly settingsService: SettingsService,
    private readonly rateService: RateService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({
    status: 201,
    description:
      'The transaction has been successfully created. Returns transaction, updated account, and total balance summary.',
    schema: {
      type: 'object',
      properties: {
        transaction: { $ref: '#/components/schemas/TransactionDto' },
        account: { $ref: '#/components/schemas/AccountDto' },
        summary: { $ref: '#/components/schemas/AccountSummaryDto' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Category or account not found.',
  })
  async create(
    @UserDecorator() user: RequestUser,
    @Body() createTransactionDto: CreateTransactionDto,
  ): Promise<CreateTransactionResponseDto> {
    const transaction = await this.transactionService.create(
      user.userId,
      createTransactionDto,
    );
    const account = await this.accountService.findOne(
      user.userId,
      createTransactionDto.account,
    );
    const summary = await this.accountService.getSummary(user.userId);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const settings = await this.settingsService.findByUserId(user.userId);
    const rates = await this.rateService.getLatestValidRate();

    return {
      summary,
      account: this.accountService.toAccountDto(account),
      transaction: this.transactionService.toTransactionDto(transaction, {
        settings,
        rates,
      }),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all transactions for the current user',
    description:
      'Optional query filters: dateFrom, dateTo (period), type, category, account. Any combination is supported.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all transactions for the current user.',
    type: [TransactionDto],
  })
  async findAll(
    @UserDecorator() user: RequestUser,
    @Query() filters: TransactionFilterDto,
  ): Promise<TransactionDto[]> {
    const transactions = await this.transactionService.findAll(
      user.userId,
      filters,
    );
    const settings = await this.settingsService.findByUserId(user.userId);
    const rates = await this.rateService.getLatestValidRate();
    const options = { settings, rates };
    return transactions.map((t) =>
      this.transactionService.toTransactionDto(t, options),
    );
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
    const settings = await this.settingsService.findByUserId(user.userId);
    const rates = await this.rateService.getLatestValidRate();
    return this.transactionService.toTransactionDto(transaction, {
      settings,
      rates,
    });
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
    const settings = await this.settingsService.findByUserId(user.userId);
    const rates = await this.rateService.getLatestValidRate();
    return this.transactionService.toTransactionDto(transaction, {
      settings,
      rates,
    });
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
