import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Category, CategorySchema } from '../category/category.schema';
import { Account, AccountSchema } from '../account/account.schema';
import { Tag, TagSchema } from '../tag/tag.schema';
import { AccountModule } from '../account/account.module';
import { CategoryModule } from '../category/category.module';
import { TagModule } from '../tag/tag.module';
import { SettingsModule } from '../settings/settings.module';
import { RateModule } from '../rate/rate.module';
import { MoneyModule } from '../money/money.module';

import { Transaction, TransactionSchema } from './transaction.schema';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Account.name, schema: AccountSchema },
      { name: Tag.name, schema: TagSchema },
    ]),
    forwardRef(() => AccountModule),
    CategoryModule,
    TagModule,
    forwardRef(() => SettingsModule),
    RateModule,
    MoneyModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [
    TransactionService,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
})
export class TransactionModule {}
