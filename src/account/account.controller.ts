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
import { I18n, I18nContext } from 'nestjs-i18n';

import { AccountService } from './account.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountDto,
  AccountSummaryDto,
  AccountListResponseDto,
  AccountWithSummaryResponseDto,
  ReorderAccountsDto,
} from './account.dto';
import { UserDecorator } from '../auth/user.decorator';
import type { RequestUser } from '../auth/auth.dto';

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({
    status: 201,
    description:
      'The account has been successfully created. Returns account and new total.',
    schema: {
      type: 'object',
      properties: {
        account: { $ref: '#/components/schemas/AccountDto' },
        summary: { $ref: '#/components/schemas/AccountSummaryDto' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 409, description: 'Account name already exists.' })
  async create(
    @UserDecorator() user: RequestUser,
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<AccountWithSummaryResponseDto> {
    const account = await this.accountService.create(
      user.userId,
      createAccountDto,
    );
    const summary = await this.accountService.getSummary(user.userId);
    return {
      account: this.accountService.toAccountDto(account),
      summary,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all accounts for the current user' })
  @ApiResponse({
    status: 200,
    description:
      'List of all accounts for the current user with total balance summary.',
    schema: {
      type: 'object',
      properties: {
        list: {
          type: 'array',
          items: { $ref: '#/components/schemas/AccountDto' },
        },
        summary: { $ref: '#/components/schemas/AccountSummaryDto' },
      },
    },
  })
  async findAll(
    @UserDecorator() user: RequestUser,
  ): Promise<AccountListResponseDto> {
    return this.accountService.findAllWithSummary(user.userId);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get total balance of all accounts in user currency',
  })
  @ApiResponse({
    status: 200,
    description:
      'Total balance of all accounts converted to user currency via USD.',
    type: AccountSummaryDto,
  })
  @ApiResponse({ status: 400, description: 'Exchange rate not found.' })
  async getSummary(
    @UserDecorator() user: RequestUser,
  ): Promise<AccountSummaryDto> {
    return this.accountService.getSummary(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an account by ID' })
  @ApiResponse({
    status: 200,
    description: 'The account.',
    type: AccountDto,
  })
  @ApiResponse({ status: 404, description: 'Account not found.' })
  async findOne(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<AccountDto> {
    const account = await this.accountService.findOne(user.userId, id);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return this.accountService.toAccountDto(account);
  }

  @Patch('reorder')
  @ApiOperation({
    summary:
      'Reorder accounts by providing list of account IDs (index = order)',
  })
  @ApiResponse({
    status: 200,
    description: 'Accounts have been reordered.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'One or more accounts not found.' })
  async reorder(
    @UserDecorator() user: RequestUser,
    @Body() body: ReorderAccountsDto,
    @I18n() i18n: I18nContext,
  ): Promise<{ status: number; message: string }> {
    await this.accountService.reorder(user.userId, body.ids);
    return {
      status: HttpStatus.OK,
      message: i18n.t('account.reorder.success'),
    };
  }

  @Patch('excluded/:id')
  @ApiOperation({ summary: 'Toggle account excluded from total balance' })
  @ApiResponse({
    status: 200,
    description:
      'The account excluded flag has been toggled. Returns account and new total.',
    schema: {
      type: 'object',
      properties: {
        account: { $ref: '#/components/schemas/AccountDto' },
        summary: { $ref: '#/components/schemas/AccountSummaryDto' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Account not found.' })
  async toggleExcluded(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<AccountWithSummaryResponseDto> {
    const account = await this.accountService.toggleExcluded(user.userId, id);
    const summary = await this.accountService.getSummary(user.userId);
    return {
      account: this.accountService.toAccountDto(account),
      summary,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an account by ID' })
  @ApiResponse({
    status: 200,
    description:
      'The account has been successfully updated. Returns account and new total.',
    schema: {
      type: 'object',
      properties: {
        account: { $ref: '#/components/schemas/AccountDto' },
        summary: { $ref: '#/components/schemas/AccountSummaryDto' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Currency cannot be changed when account has transactions.',
  })
  @ApiResponse({ status: 404, description: 'Account not found.' })
  @ApiResponse({ status: 409, description: 'Account name already exists.' })
  async update(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<AccountWithSummaryResponseDto> {
    const account = await this.accountService.update(
      user.userId,
      id,
      updateAccountDto,
    );
    const summary = await this.accountService.getSummary(user.userId);
    return {
      account: this.accountService.toAccountDto(account),
      summary,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an account by ID' })
  @ApiResponse({
    status: 200,
    description:
      'The account has been successfully deleted. Returns new total balance.',
    type: AccountSummaryDto,
  })
  @ApiResponse({ status: 404, description: 'Account not found.' })
  async remove(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<AccountSummaryDto> {
    return this.accountService.remove(user.userId, id);
  }
}
