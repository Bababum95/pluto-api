import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { Currency, CurrencyDocument } from './currency.schema';
import {
  CreateCurrencyDto,
  UpdateCurrencyDto,
  CurrencyDto,
} from './currency.dto';
import { CurrencyData } from './currency.types';
import { CURRENCY_API_CLIENT } from './currency.constants';

type CurrencyApiClient = {
  currencies: () => Promise<{
    data?: Record<string, CurrencyData>;
  }>;
};

@Injectable()
export class CurrencyService {
  constructor(
    @Inject(CURRENCY_API_CLIENT)
    private readonly currencyClient: CurrencyApiClient,

    @InjectModel(Currency.name)
    private readonly currencyModel: Model<CurrencyDocument>,
    private readonly i18n: I18nService,
  ) {}

  async create(
    createCurrencyDto: CreateCurrencyDto,
  ): Promise<CurrencyDocument> {
    const createdCurrency = new this.currencyModel(createCurrencyDto);
    return createdCurrency.save();
  }

  async findAll(): Promise<CurrencyDocument[]> {
    return this.currencyModel.find().exec();
  }

  async findOne(id: string): Promise<CurrencyDocument> {
    const currency = await this.currencyModel.findById(id).exec();
    if (!currency) {
      throw new NotFoundException(this.i18n.t('currency.errors.notFound'));
    }
    return currency;
  }

  /**
   * Find currency by code (e.g. 'USD' for default settings).
   */
  async findByCode(code: string): Promise<CurrencyDocument | null> {
    return this.currencyModel.findOne({ code: code.toUpperCase() }).exec();
  }

  async update(
    id: string,
    updateCurrencyDto: UpdateCurrencyDto,
  ): Promise<CurrencyDocument> {
    const currency = await this.currencyModel
      .findByIdAndUpdate(id, updateCurrencyDto, { new: true })
      .exec();
    if (!currency) {
      throw new NotFoundException(this.i18n.t('currency.errors.notFound'));
    }
    return currency;
  }

  async remove(id: string): Promise<CurrencyDocument> {
    const currency = await this.currencyModel.findByIdAndDelete(id).exec();
    if (!currency) {
      throw new NotFoundException(this.i18n.t('currency.errors.notFound'));
    }
    return currency;
  }

  async sync(): Promise<void> {
    try {
      const currencies = await this.currencyClient.currencies();

      if (!currencies.data || typeof currencies.data !== 'object') {
        throw new Error(
          this.i18n.t('currency.errors.sync.noData') || 'Currencies not found',
        );
      }

      const operations = Object.values(currencies.data).map(
        (currency: CurrencyData) => ({
          updateOne: {
            filter: { code: currency.code },
            update: { $set: currency },
            upsert: true,
          },
        }),
      );

      await this.currencyModel.bulkWrite(operations, {
        ordered: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        this.i18n.t('currency.errors.sync.failed', {
          args: { errorMessage },
        }) || `Failed to sync currencies: ${errorMessage}`,
      );
    }
  }

  toCurrencyDto(currency: CurrencyDocument): CurrencyDto {
    return {
      id: currency._id.toString(),
      code: currency.code,
      symbol: currency.symbol,
      name: currency.name,
      symbol_native: currency.symbol_native,
      decimal_digits: currency.decimal_digits,
      rounding: currency.rounding,
      name_plural: currency.name_plural,
      type: currency.type,
    };
  }
}
