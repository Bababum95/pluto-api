/**
 * Script: check rates TTL and update if expired.
 * - If latest rate is within RATES_TTL_MS (env): exit OK (no update).
 * - If expired or no rates exist: fetch from external API and update DB.
 *
 * Usage: pnpm run update:rates (or ts-node -r tsconfig-paths/register src/scripts/update-rates.ts)
 * Requires: MONGODB_URI, CURRENCY_API_KEY (and optionally MONGODB_DB_NAME, RATES_TTL_MS) in .env
 */
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from '../app.module';
import { RateService } from '../rate/rate.service';
import { RATES_TTL_MS_DEFAULT } from '../rate/rate.constants';

async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error'],
  });

  const configService = app.get(ConfigService);
  const raw = configService.get<string>('RATES_TTL_MS');
  const ratesTtlMs = raw ? parseInt(raw, 10) : RATES_TTL_MS_DEFAULT;

  const rateService = app.get(RateService);
  const latest = await rateService.getLatestUpdatedRate();

  const isValid =
    latest && Date.now() - new Date(latest.updatedAt).getTime() < ratesTtlMs;

  if (isValid) {
    console.log('Rates are valid (within TTL), no update needed.');
    await app.close();
    return;
  }

  console.log(
    latest
      ? 'Rates expired (TTL exceeded), fetching and updating...'
      : 'No rates found, fetching and updating...',
  );
  await rateService.fetchAndUpdateRates();
  console.log('Rates updated successfully.');
  await app.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
