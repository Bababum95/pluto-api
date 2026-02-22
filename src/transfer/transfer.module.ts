import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Account, AccountSchema } from '../account/account.schema';

import { TransferController } from './transfer.controller';
import { Transfer, TransferSchema } from './transfer.schema';
import { TransferService } from './transfer.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transfer.name, schema: TransferSchema },
      { name: Account.name, schema: AccountSchema },
    ]),
  ],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}
