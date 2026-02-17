import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Currency, CurrencySchema } from '../currency/currency.schema';
import { CurrencyModule } from '../currency/currency.module';
import { RateModule } from '../rate/rate.module';
import { SettingsModule } from '../settings/settings.module';
import { MoneyModule } from '../money/money.module';

import { Account, AccountSchema } from './account.schema';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Currency.name, schema: CurrencySchema },
    ]),
    CurrencyModule,
    RateModule,
    forwardRef(() => SettingsModule),
    MoneyModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
