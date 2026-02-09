import currencyapi from '@everapi/currencyapi-js';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';
import { Currency, CurrencySchema } from './currency.schema';
import { CURRENCY_API_CLIENT } from './currency.constants';
import { CurrencyApiClient } from './currency.types';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Currency.name, schema: CurrencySchema },
    ]),
  ],
  controllers: [CurrencyController],
  providers: [
    {
      provide: CURRENCY_API_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): CurrencyApiClient => {
        const apiKey = configService.get<string>('CURRENCY_API_KEY');
        if (!apiKey) {
          throw new Error('CURRENCY_API_KEY is not configured');
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        return new currencyapi(apiKey) as CurrencyApiClient;
      },
    },
    CurrencyService,
  ],
  exports: [CURRENCY_API_CLIENT, CurrencyService],
})
export class CurrencyModule {}
