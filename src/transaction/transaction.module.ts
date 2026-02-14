import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Transaction, TransactionSchema } from './transaction.schema';
import { Category, CategorySchema } from '../category/category.schema';
import { Account, AccountSchema } from '../account/account.schema';
import { AccountModule } from '../account/account.module';
import { CategoryModule } from '../category/category.module';
import { SettingsModule } from '../settings/settings.module';
import { RateModule } from '../rate/rate.module';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Account.name, schema: AccountSchema },
    ]),
    AccountModule,
    CategoryModule,
    SettingsModule,
    RateModule,
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
