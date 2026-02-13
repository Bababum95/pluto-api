/**
 * One-off script: set transaction type to "expense" for all categories
 * that have no type or an invalid type. Use after adding the type field or to fix legacy data.
 *
 * Usage: pnpm run fix:category-type (or ts-node -r tsconfig-paths/register src/scripts/fix-category-type.ts)
 * Requires: MONGODB_URI (and optionally MONGODB_DB_NAME) in .env
 */
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AppModule } from '../app.module';
import { Category, CategoryDocument } from '../category/category.schema';
import { TransactionType } from '../transaction/transaction.enum';

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error'],
  });

  const categoryModel = app.get<Model<CategoryDocument>>(
    getModelToken(Category.name),
  );

  const validTypes = Object.values(TransactionType);
  const result = await categoryModel
    .updateMany(
      {
        $or: [
          { type: { $exists: false } },
          { type: null },
          { type: { $nin: validTypes } },
        ],
      },
      { $set: { type: TransactionType.EXPENSE } },
    )
    .exec();

  console.log(
    `Done. Matched: ${result.matchedCount}, modified: ${result.modifiedCount}.`,
  );
  await app.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
