import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { Account, AccountDocument } from './account.schema';
import { Currency, CurrencyDocument } from '../currency/currency.schema';
import { CurrencyService } from '../currency/currency.service';
import { CreateAccountDto, UpdateAccountDto, AccountDto } from './account.dto';

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Currency.name)
    private readonly currencyModel: Model<CurrencyDocument>,
    private readonly currencyService: CurrencyService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Convert decimal balance to minor units (e.g., 1000.50 USD -> 100050 cents)
   */
  private toMinorUnits(balance: number, scale: number): number {
    return Math.round(balance * Math.pow(10, scale));
  }

  /**
   * Convert minor units to decimal balance (e.g., 100050 cents -> 1000.50 USD)
   */
  private fromMinorUnits(balance: number, scale: number): number {
    return balance / Math.pow(10, scale);
  }

  async create(
    userId: string,
    createAccountDto: CreateAccountDto,
  ): Promise<AccountDocument> {
    // Check if account with same name already exists for this user
    const existing = await this.accountModel
      .findOne({
        user: new Types.ObjectId(userId),
        name: createAccountDto.name.trim(),
      })
      .exec();

    if (existing) {
      throw new ConflictException(
        this.i18n.t('account.errors.nameAlreadyExists'),
      );
    }

    // Validate currency exists
    const currency = await this.currencyModel
      .findById(createAccountDto.currency)
      .exec();

    if (!currency) {
      throw new BadRequestException(
        this.i18n.t('account.errors.currencyNotFound'),
      );
    }

    const balanceInMinorUnits = this.toMinorUnits(
      createAccountDto.balance ?? 0,
      createAccountDto.scale,
    );

    // Calculate order: max(order) + 1 for this user, or 0 if no accounts exist
    const maxOrderAccount = await this.accountModel
      .findOne({ user: new Types.ObjectId(userId) })
      .sort({ order: -1 })
      .select('order')
      .lean()
      .exec();

    const order =
      createAccountDto.order !== undefined
        ? createAccountDto.order
        : (maxOrderAccount?.order ?? -1) + 1;

    const account = new this.accountModel({
      color: createAccountDto.color,
      icon: createAccountDto.icon,
      name: createAccountDto.name.trim(),
      currency: new Types.ObjectId(createAccountDto.currency),
      scale: createAccountDto.scale,
      user: new Types.ObjectId(userId),
      balance: balanceInMinorUnits,
      order,
    });

    await account.save();
    const created = await this.accountModel.findById(account._id).exec();
    if (!created) {
      throw new Error(this.i18n.t('account.create.failed'));
    }
    return created;
  }

  async findAll(userId: string): Promise<AccountDocument[]> {
    return this.accountModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('currency')
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<AccountDocument | null> {
    return this.accountModel
      .findOne({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .populate('currency')
      .exec();
  }

  async update(
    userId: string,
    id: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<AccountDocument> {
    // Get existing account to know current scale if balance is being updated
    const existingAccount = await this.accountModel
      .findOne({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .exec();

    if (!existingAccount) {
      throw new NotFoundException(this.i18n.t('account.errors.notFound'));
    }

    // If name is being updated, check for conflicts
    if (updateAccountDto.name) {
      const nameConflict = await this.accountModel
        .findOne({
          user: new Types.ObjectId(userId),
          name: updateAccountDto.name.trim(),
          _id: { $ne: id },
        })
        .exec();

      if (nameConflict) {
        throw new ConflictException(
          this.i18n.t('account.errors.nameAlreadyExists'),
        );
      }
    }

    // Prepare update data
    const updateData: Partial<Account> = {};

    if (updateAccountDto.name) {
      updateData.name = updateAccountDto.name.trim();
    }
    if (updateAccountDto.color !== undefined) {
      updateData.color = updateAccountDto.color;
    }
    if (updateAccountDto.icon !== undefined) {
      updateData.icon = updateAccountDto.icon;
    }
    if (updateAccountDto.currency !== undefined) {
      // Validate currency exists
      const currency = await this.currencyModel
        .findById(updateAccountDto.currency)
        .exec();

      if (!currency) {
        throw new BadRequestException(
          this.i18n.t('account.errors.currencyNotFound'),
        );
      }
      updateData.currency = new Types.ObjectId(updateAccountDto.currency);
    }
    if (updateAccountDto.scale !== undefined) {
      updateData.scale = updateAccountDto.scale;
    }
    if (updateAccountDto.order !== undefined) {
      updateData.order = updateAccountDto.order;
    }
    if (updateAccountDto.balance !== undefined) {
      // Use new scale if provided, otherwise use existing scale
      const scale = updateAccountDto.scale ?? existingAccount.scale;
      updateData.balance = this.toMinorUnits(updateAccountDto.balance, scale);
    }

    const account = await this.accountModel
      .findOneAndUpdate(
        { _id: id, user: new Types.ObjectId(userId) },
        updateData,
        { new: true },
      )
      .populate('currency')
      .exec();

    if (!account) {
      throw new NotFoundException(this.i18n.t('account.errors.notFound'));
    }

    return account;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const result = await this.accountModel
      .findOneAndDelete({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .exec();

    if (!result) {
      throw new NotFoundException(this.i18n.t('account.errors.notFound'));
    }

    return true;
  }

  toAccountDto(account: AccountDocument): AccountDto {
    return {
      id: account._id.toString(),
      color: account.color,
      icon: account.icon,
      name: account.name,
      balance: this.fromMinorUnits(account.balance, account.scale),
      scale: account.scale,
      currency: this.currencyService.toCurrencyDto(account.currency),
      order: account.order,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }
}
