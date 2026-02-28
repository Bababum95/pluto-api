/**
 * Migration: set transaction `date` from `createdAt` for existing documents.
 * Run once after adding the `date` field to the Transaction schema.
 *
 * Usage: pnpm run migrate:transaction-date
 * Requires: MONGODB_URI (and optionally MONGODB_DB_NAME) in .env
 */
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AppModule } from '../app.module';
import {
  Transaction,
  TransactionDocument,
} from '../transaction/transaction.schema';

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error'],
  });

  const transactionModel = app.get<Model<TransactionDocument>>(
    getModelToken(Transaction.name),
  );

  const result = await transactionModel.updateMany(
    { date: { $exists: false } },
    [
      {
        $set: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
              timezone: 'UTC',
            },
          },
        },
      },
    ],
    { updatePipeline: true },
  );

  console.log(
    `Migration done: matched ${result.matchedCount}, modified ${result.modifiedCount} transactions.`,
  );
  await app.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
