import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Settings, SettingsSchema } from './settings.schema';
import { Account, AccountSchema } from '../account/account.schema';
import { CurrencyModule } from '../currency/currency.module';
import { AccountModule } from '../account/account.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Settings.name, schema: SettingsSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    CurrencyModule,
    forwardRef(() => AccountModule),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
