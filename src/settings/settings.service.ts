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

import { Settings, SettingsDocument } from './settings.schema';
import { Account, AccountDocument } from '../account/account.schema';
import { CurrencyService } from '../currency/currency.service';
import { AccountService } from '../account/account.service';
import { UpdateSettingsDto, SettingsDto } from './settings.dto';

/** Default currency code for new user settings */
const DEFAULT_CURRENCY_CODE = 'USD';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name)
    private readonly settingsModel: Model<SettingsDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    private readonly currencyService: CurrencyService,
    @Inject(forwardRef(() => AccountService))
    private readonly accountService: AccountService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Create default settings for a newly registered user: currency USD, account null.
   */
  async createDefault(userId: string): Promise<SettingsDocument> {
    const usd = await this.currencyService.findByCode(DEFAULT_CURRENCY_CODE);
    if (!usd) {
      throw new Error(
        this.i18n.t('settings.create.failed') +
          ' Default currency USD not found. Run currency sync.',
      );
    }
    const settings = new this.settingsModel({
      user: new Types.ObjectId(userId),
      currency: usd._id,
      account: null,
    });
    await settings.save();
    const created = await this.settingsModel
      .findById(settings._id)
      .populate('currency')
      .populate('account')
      .exec();
    if (!created) {
      throw new Error(this.i18n.t('settings.create.failed'));
    }
    return created;
  }

  /**
   * Get settings for user (one per user).
   */
  async findByUserId(userId: string): Promise<SettingsDocument | null> {
    return this.settingsModel
      .findOne({ user: new Types.ObjectId(userId) })
      .populate('currency')
      .populate('account')
      .exec();
  }

  /**
   * Get settings or throw if not found.
   */
  async findOneOrFail(userId: string): Promise<SettingsDocument> {
    const settings = await this.findByUserId(userId);
    if (!settings) {
      throw new NotFoundException(this.i18n.t('settings.errors.notFound'));
    }
    return settings;
  }

  /**
   * Update user settings (currency and/or default account).
   */
  async update(
    userId: string,
    updateSettingsDto: UpdateSettingsDto,
  ): Promise<SettingsDocument> {
    await this.findOneOrFail(userId);

    const updateData: {
      currency?: Types.ObjectId;
      account?: Types.ObjectId | null;
    } = {};

    if (updateSettingsDto.currency !== undefined) {
      try {
        await this.currencyService.findOne(updateSettingsDto.currency);
      } catch {
        throw new BadRequestException(
          this.i18n.t('settings.errors.currencyNotFound'),
        );
      }
      updateData.currency = new Types.ObjectId(updateSettingsDto.currency);
    }

    if (updateSettingsDto.account !== undefined) {
      if (
        updateSettingsDto.account === null ||
        updateSettingsDto.account === ''
      ) {
        updateData.account = null;
      } else {
        const account = await this.accountService.findOne(
          userId,
          updateSettingsDto.account,
        );
        if (!account) {
          throw new BadRequestException(
            this.i18n.t('settings.errors.accountNotFound'),
          );
        }
        updateData.account = new Types.ObjectId(updateSettingsDto.account);
      }
    }

    const updated = await this.settingsModel
      .findOneAndUpdate({ user: new Types.ObjectId(userId) }, updateData, {
        new: true,
      })
      .populate('currency')
      .populate('account')
      .exec();

    if (!updated) {
      throw new NotFoundException(this.i18n.t('settings.errors.notFound'));
    }
    return updated;
  }

  toSettingsDto(settings: SettingsDocument): SettingsDto {
    return {
      id: settings._id.toString(),
      currency: this.currencyService.toCurrencyDto(settings.currency),
      account: settings.account
        ? this.accountService.toAccountDto(settings.account)
        : null,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
