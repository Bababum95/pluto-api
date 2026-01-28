/**
 * Domain types for Currency entity
 * These types represent the core business logic and are independent of infrastructure concerns
 */

import type { RateType } from '../rate/rate.types';

import type { CreateCurrencyDto } from './currency.dto';

export enum CurrencyType {
  FIAT = 'fiat',
  CRYPTO = 'crypto',
}

export type CurrencyData = InstanceType<typeof CreateCurrencyDto>;

export type CurrencyApiClient = {
  currencies: () => Promise<{
    data?: Record<string, CurrencyData>;
  }>;
  latest: (params: { base_currency: string }) => Promise<{
    data?: Record<string, RateType>;
  }>;
};
