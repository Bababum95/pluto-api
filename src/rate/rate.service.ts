import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CURRENCY_API_CLIENT } from '../currency/currency.constants';
import type { CurrencyApiClient } from '../currency/currency.types';

import { Rate, RateDocument } from './rate.schema';
import { CreateRateDto, UpdateRateDto, RateDto } from './rate.dto';
import { RateType } from './rate.types';
import { RATES_TTL_MS_DEFAULT } from './rate.constants';

@Injectable()
export class RateService {
  constructor(
    @InjectModel(Rate.name)
    private readonly rateModel: Model<RateDocument>,

    @Inject(CURRENCY_API_CLIENT)
    private readonly currencyClient: CurrencyApiClient,

    private readonly configService: ConfigService,
  ) {}

  private get ratesTtlMs(): number {
    const raw = this.configService.get<string>('RATES_TTL_MS');
    return raw ? parseInt(raw, 10) : RATES_TTL_MS_DEFAULT;
  }

  /**
   * Map Rate document to normalized API DTO (id as string, dates as ISO).
   */
  toRateDto(rate: RateDocument): RateDto {
    return {
      id: rate._id.toString(),
      code: rate.code,
      value: rate.value,
      createdAt: rate.createdAt.toISOString(),
      updatedAt: rate.updatedAt.toISOString(),
    };
  }

  async create(createRateDto: CreateRateDto): Promise<RateDocument> {
    const createdRate = new this.rateModel(createRateDto);
    return createdRate.save();
  }

  async findAll(): Promise<RateDocument[]> {
    return this.rateModel.find().exec();
  }

  async findOne(id: string): Promise<RateDocument> {
    const rate = await this.rateModel.findById(id).exec();
    if (!rate) {
      throw new Error('Rate not found');
    }

    const updatedAt = rate.updatedAt;
    if (
      updatedAt &&
      Date.now() - new Date(updatedAt).getTime() > this.ratesTtlMs
    ) {
      await this.fetchAndUpdateRates();
      return this.findOne(id);
    }

    return rate;
  }

  async findByCode(code: string): Promise<RateDocument> {
    const rate = await this.rateModel.findOne({ code }).exec();
    if (!rate) {
      throw new Error('Rate not found');
    }

    const updatedAt = rate.updatedAt;
    if (
      updatedAt &&
      Date.now() - new Date(updatedAt).getTime() > this.ratesTtlMs
    ) {
      await this.fetchAndUpdateRates();
      return this.findByCode(code);
    }

    return rate;
  }

  async update(
    id: string,
    updateRateDto: UpdateRateDto,
  ): Promise<RateDocument> {
    const rate = await this.rateModel
      .findByIdAndUpdate(id, updateRateDto, { new: true })
      .exec();
    if (!rate) {
      throw new Error('Rate not found');
    }
    return rate;
  }

  async remove(id: string): Promise<RateDocument> {
    const rate = await this.rateModel.findByIdAndDelete(id).exec();
    if (!rate) {
      throw new Error('Rate not found');
    }
    return rate;
  }

  /**
   * Get the latest updated rate from database
   */
  async getLatestUpdatedRate(): Promise<RateDocument | null> {
    const result = await this.rateModel
      .findOne()
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
    return result;
  }

  /**
   * Update multiple rates using bulk write operation
   */
  async updateManyRates(rates: RateType[]): Promise<void> {
    const operations = rates.map((rate) => ({
      updateOne: {
        filter: { code: rate.code },
        update: { $set: rate },
        upsert: true,
      },
    }));

    await this.rateModel.bulkWrite(operations, {
      ordered: false,
    });
  }

  /**
   * Fetch rates from external API and update database
   */
  async fetchAndUpdateRates(): Promise<void> {
    const response = await this.currencyClient.latest({
      base_currency: 'USD',
    });

    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Currencies not found');
    }

    const rates = Object.values(response.data).map((rate) => ({
      code: rate.code,
      value: rate.value,
    }));

    await this.updateManyRates(rates);
  }

  async ensureFreshRates(): Promise<void> {
    const latest = await this.getLatestUpdatedRate();

    const isValid =
      latest &&
      Date.now() - new Date(latest.updatedAt).getTime() < this.ratesTtlMs;

    if (!isValid) await this.fetchAndUpdateRates();
  }

  /**
   * Get latest valid rate, update if expired
   */
  async getLatestValidRate(): Promise<RateDocument[]> {
    await this.ensureFreshRates();

    return this.findAll();
  }
}
