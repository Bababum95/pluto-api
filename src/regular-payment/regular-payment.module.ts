import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Account, AccountSchema } from '../account/account.schema';
import { AccountModule } from '../account/account.module';
import { Category, CategorySchema } from '../category/category.schema';
import { CategoryModule } from '../category/category.module';
import { MoneyModule } from '../money/money.module';
import { RateModule } from '../rate/rate.module';
import { SettingsModule } from '../settings/settings.module';
import { Tag, TagSchema } from '../tag/tag.schema';
import { TagModule } from '../tag/tag.module';

import { RegularPayment, RegularPaymentSchema } from './regular-payment.schema';
import { RegularPaymentController } from './regular-payment.controller';
import { RegularPaymentService } from './regular-payment.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RegularPayment.name, schema: RegularPaymentSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Account.name, schema: AccountSchema },
      { name: Tag.name, schema: TagSchema },
    ]),
    AccountModule,
    CategoryModule,
    TagModule,
    SettingsModule,
    RateModule,
    MoneyModule,
  ],
  controllers: [RegularPaymentController],
  providers: [RegularPaymentService],
  exports: [
    RegularPaymentService,
    MongooseModule.forFeature([
      { name: RegularPayment.name, schema: RegularPaymentSchema },
    ]),
  ],
})
export class RegularPaymentModule {}
