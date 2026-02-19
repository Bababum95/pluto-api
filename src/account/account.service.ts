import Decimal from 'decimal.js';
import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { Currency, CurrencyDocument } from '../currency/currency.schema';
import { CurrencyService } from '../currency/currency.service';
import { RateService } from '../rate/rate.service';
import { SettingsService } from '../settings/settings.service';
import { Rate } from '../rate/rate.schema';
import { MoneyService } from '../money/money.service';

import { Account, AccountDocument } from './account.schema';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountDto,
  AccountBalanceViewDto,
  AccountSummaryDto,
  AccountListResponseDto,
} from './account.dto';

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Currency.name)
    private readonly currencyModel: Model<CurrencyDocument>,
    private readonly currencyService: CurrencyService,
    private readonly rateService: RateService,
    @Inject(forwardRef(() => SettingsService))
    private readonly settingsService: SettingsService,
    private readonly i18n: I18nService,
    private readonly moneyService: MoneyService,
  ) {}

  async create(
    userId: string,
    createAccountDto: CreateAccountDto,
  ): Promise<AccountDocument> {
    // Validate currency exists
    const currency = await this.currencyModel
      .findById(createAccountDto.currency)
      .exec();

    if (!currency) {
      throw new BadRequestException(
        this.i18n.t('account.errors.currencyNotFound'),
      );
    }

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
      description: createAccountDto.description?.trim(),
      currency: new Types.ObjectId(createAccountDto.currency),
      scale: createAccountDto.scale,
      user: new Types.ObjectId(userId),
      balance: createAccountDto.balance,
      order,
    });

    await account.save();
    const created = await this.accountModel
      .findById(account._id)
      .populate('currency')
      .exec();
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
      updateData.balance = updateAccountDto.balance;
    }
    if (updateAccountDto.excluded !== undefined) {
      updateData.excluded = updateAccountDto.excluded;
    }
    if (updateAccountDto.description !== undefined) {
      updateData.description = updateAccountDto.description.trim() || undefined;
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

  async toggleExcluded(userId: string, id: string): Promise<AccountDocument> {
    const account = await this.accountModel
      .findOne({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .exec();

    if (!account) {
      throw new NotFoundException(this.i18n.t('account.errors.notFound'));
    }

    account.excluded = !account.excluded;
    await account.save();

    const updated = await this.accountModel
      .findById(account._id)
      .populate('currency')
      .exec();

    if (!updated) {
      throw new NotFoundException(this.i18n.t('account.errors.notFound'));
    }

    return updated;
  }

  async remove(userId: string, id: string): Promise<AccountSummaryDto> {
    const result = await this.accountModel
      .findOneAndDelete({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .exec();

    if (!result) {
      throw new NotFoundException(this.i18n.t('account.errors.notFound'));
    }

    return this.getSummary(userId);
  }

  toAccountDto(
    account: AccountDocument,
    conversionContext?: { rates: Rate[]; targetCurrency: CurrencyDocument },
  ): AccountDto {
    const original = {
      value: this.moneyService.fromMinorUnits(account.balance, account.scale),
      raw: account.balance,
      scale: account.scale,
      currency: this.currencyService.toCurrencyDto(account.currency),
    };

    let converted: AccountDto['balance']['converted'];
    if (conversionContext) {
      const amountDecimal = this.moneyService.fromMinorUnitsDecimal(
        account.balance,
        account.scale,
      );
      const convertedView = this.moneyService.convertAmount(
        amountDecimal,
        account.currency.code,
        conversionContext.rates,
        conversionContext.targetCurrency,
      );
      converted = convertedView ?? original;
    } else {
      converted = original;
    }

    const balance: AccountBalanceViewDto = { original, converted };

    return {
      id: account._id.toString(),
      color: account.color,
      icon: account.icon,
      name: account.name,
      description: account.description,
      balance,
      order: account.order,
      createdAt: account.createdAt.toISOString(),
      excluded: account.excluded ?? false,
      updatedAt: account.updatedAt.toISOString(),
    };
  }

  /**
   * Calculates total balance across accounts in target currency.
   * All calculations are done using Decimal.js for precision.
   */
  calculateAccountsSummary(
    accounts: AccountDocument[],
    rates: Rate[],
    targetCurrency: CurrencyDocument,
  ): AccountSummaryDto {
    let totalInUSD = new Decimal(0);

    for (const account of accounts) {
      const accountAmountDecimal = this.moneyService.fromMinorUnitsDecimal(
        account.balance,
        account.scale,
      );

      const amountInUSD = this.moneyService.toUSD(
        accountAmountDecimal,
        account.currency.code,
        rates,
      );

      if (!amountInUSD) {
        throw new Error(`Rate not found for currency ${account.currency.code}`);
      }

      totalInUSD = totalInUSD.plus(amountInUSD);
    }

    const totalInTarget = this.moneyService.fromUSD(
      totalInUSD,
      targetCurrency,
      rates,
    );

    if (!totalInTarget) {
      throw new Error(`Rate not found for currency ${targetCurrency.code}`);
    }

    const { rounded, rawMinor } = this.moneyService.roundToScale(
      totalInTarget,
      targetCurrency.decimal_digits,
    );

    return {
      total_raw: rawMinor,
      total: rounded.toNumber(),
      scale: targetCurrency.decimal_digits,
      currency: this.currencyService.toCurrencyDto(targetCurrency),
    };
  }

  async getSummary(userId: string): Promise<AccountSummaryDto> {
    const settings = await this.settingsService.findOneOrFail(userId);
    const accounts = await this.findAll(userId);
    const rates = await this.rateService.getLatestValidRate();

    return this.calculateAccountsSummary(accounts, rates, settings.currency);
  }

  async findAllWithSummary(userId: string): Promise<AccountListResponseDto> {
    const settings = await this.settingsService.findOneOrFail(userId);
    const accounts = await this.findAll(userId);
    const rates = await this.rateService.getLatestValidRate();

    const list = accounts.map((account) =>
      this.toAccountDto(account, {
        rates,
        targetCurrency: settings.currency,
      }),
    );
    const summary = this.calculateAccountsSummary(
      accounts,
      rates,
      settings.currency,
    );

    return { list, summary };
  }
}
