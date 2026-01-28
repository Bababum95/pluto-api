/**
 * Domain types for Currency entity
 * These types represent the core business logic and are independent of infrastructure concerns
 */

export enum CurrencyType {
  FIAT = 'fiat',
  CRYPTO = 'crypto',
}

// Extract type from DTO to ensure consistency
import type { CreateCurrencyDto } from './currency.dto';

export type CurrencyData = InstanceType<typeof CreateCurrencyDto>;
