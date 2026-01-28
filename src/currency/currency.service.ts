import currencyapi from '@everapi/currencyapi-js';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';

import { Currency, CurrencyDocument } from './currency.schema';
import { CreateCurrencyDto, UpdateCurrencyDto } from './currency.dto';
import { CurrencyData } from './currency.types';

type CurrencyApiClient = {
  currencies: () => Promise<{
    data?: Record<string, CurrencyData>;
  }>;
};

@Injectable()
export class CurrencyService {
  private currencyClient: CurrencyApiClient;

  constructor(
    @InjectModel(Currency.name) private currencyModel: Model<CurrencyDocument>,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('CURRENCY_API_KEY');
    if (!apiKey) {
      throw new Error('CURRENCY_API_KEY is not configured');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.currencyClient = new currencyapi(apiKey) as CurrencyApiClient;
  }

  async create(createCurrencyDto: CreateCurrencyDto): Promise<Currency> {
    const createdCurrency = new this.currencyModel(createCurrencyDto);
    return createdCurrency.save();
  }

  async findAll(): Promise<Currency[]> {
    return this.currencyModel.find().exec();
  }

  async findOne(id: string): Promise<Currency> {
    const currency = await this.currencyModel.findById(id).exec();
    if (!currency) {
      throw new Error('Currency not found');
    }
    return currency;
  }

  async update(
    id: string,
    updateCurrencyDto: UpdateCurrencyDto,
  ): Promise<Currency> {
    const currency = await this.currencyModel
      .findByIdAndUpdate(id, updateCurrencyDto, { new: true })
      .exec();
    if (!currency) {
      throw new Error('Currency not found');
    }
    return currency;
  }

  async remove(id: string): Promise<Currency> {
    const currency = await this.currencyModel.findByIdAndDelete(id).exec();
    if (!currency) {
      throw new Error('Currency not found');
    }
    return currency;
  }

  async sync(): Promise<void> {
    try {
      const currencies = await this.currencyClient.currencies();

      if (!currencies.data || typeof currencies.data !== 'object') {
        throw new Error('Currencies not found');
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
      throw new Error(`Failed to sync currencies: ${errorMessage}`);
    }
  }
}
