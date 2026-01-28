import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CurrencyModule } from '../currency/currency.module';

import { RateController } from './rate.controller';
import { RateService } from './rate.service';
import { Rate, RateSchema } from './rate.schema';

@Module({
  imports: [
    CurrencyModule,
    MongooseModule.forFeature([{ name: Rate.name, schema: RateSchema }]),
  ],
  controllers: [RateController],
  providers: [RateService],
})
export class RateModule {}
