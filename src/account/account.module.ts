import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Account, AccountSchema } from './account.schema';
import { Currency, CurrencySchema } from '../currency/currency.schema';
import { CurrencyModule } from '../currency/currency.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Currency.name, schema: CurrencySchema },
    ]),
    CurrencyModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
