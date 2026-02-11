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

import { AccountService } from './account.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountDto,
  AccountSummaryDto,
  AccountListResponseDto,
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
    description: 'The account has been successfully created.',
    type: AccountDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 409, description: 'Account name already exists.' })
  async create(
    @UserDecorator() user: RequestUser,
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<AccountDto> {
    const account = await this.accountService.create(
      user.userId,
      createAccountDto,
    );
    return this.accountService.toAccountDto(account);
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update an account by ID' })
  @ApiResponse({
    status: 200,
    description: 'The account has been successfully updated.',
    type: AccountDto,
  })
  @ApiResponse({ status: 404, description: 'Account not found.' })
  @ApiResponse({ status: 409, description: 'Account name already exists.' })
  async update(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<AccountDto> {
    const account = await this.accountService.update(
      user.userId,
      id,
      updateAccountDto,
    );
    return this.accountService.toAccountDto(account);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an account by ID' })
  @ApiResponse({
    status: 204,
    description: 'The account has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Account not found.' })
  async remove(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.accountService.remove(user.userId, id);
  }
}
