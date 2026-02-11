/**
 * One-off script: create default settings (currency USD, account null) for every user
 * who does not have settings yet. Run after adding the settings feature or to fix missing data.
 *
 * Usage: pnpm run seed:settings
 * Requires: MONGODB_URI (and optionally MONGODB_DB_NAME) in .env
 */
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AppModule } from '../app.module';
import { User, UserDocument } from '../user/user.schema';
import { SettingsService } from '../settings/settings.service';

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error'],
  });

  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const settingsService = app.get(SettingsService);

  const users = await userModel.find().select('_id').lean().exec();
  let created = 0;
  let skipped = 0;

  for (const u of users) {
    const userId = u._id.toString();
    const existing = await settingsService.findByUserId(userId);
    if (existing) {
      skipped++;
      continue;
    }
    try {
      await settingsService.createDefault(userId);
      created++;
      console.log(`Created default settings for user ${userId}`);
    } catch (err) {
      console.error(`Failed to create settings for user ${userId}:`, err);
    }
  }

  console.log(
    `Done. Created: ${created}, skipped (already had settings): ${skipped}`,
  );
  await app.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
