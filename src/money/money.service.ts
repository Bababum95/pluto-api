import Decimal from 'decimal.js';
import { BadRequestException, Injectable } from '@nestjs/common';

import type { Rate } from '../rate/rate.schema';
import type { CurrencyDocument } from '../currency/currency.schema';

import type { MoneyViewDto } from './money.dto';

@Injectable()
export class MoneyService {
  private static readonly MAX_SAFE_MINOR = new Decimal(Number.MAX_SAFE_INTEGER);

  /**
   * Ensure minor units fit in a JS safe integer before persisting / $inc.
   * Checks the Decimal value before `.toNumber()` so precision is not lost first.
   */
  private toSafeMinorNumber(rawMinor: Decimal): number {
    if (
      !rawMinor.isInteger() ||
      rawMinor.abs().greaterThan(MoneyService.MAX_SAFE_MINOR)
    ) {
      throw new BadRequestException(
        'Amount exceeds safe numeric range for the given scale',
      );
    }

    return rawMinor.toNumber();
  }

  /**
   * Convert minor units to decimal amount (e.g. 150050 with scale 2 -> 1500.50).
   */
  fromMinorUnits(amountRaw: number, scale: number): number {
    return this.fromMinorUnitsDecimal(amountRaw, scale).toNumber();
  }

  /**
   * Convert minor units to Decimal amount (e.g. 150050 with scale 2 -> 1500.50).
   */
  fromMinorUnitsDecimal(amountRaw: number, scale: number): Decimal {
    return new Decimal(amountRaw).div(new Decimal(10).pow(scale));
  }

  /**
   * Convert a decimal amount to integer minor units (e.g. 1500.50 with scale 2 -> 150050).
   * Uses ROUND_HALF_UP to avoid IEEE-754 float drift on values like 19.99.
   * Rejects results outside Number.MAX_SAFE_INTEGER so Mongo Number/$inc stay exact.
   */
  toMinorUnits(
    amountDecimal: number | string | Decimal,
    scale: number,
  ): number {
    const amount = new Decimal(amountDecimal);
    const factor = new Decimal(10).pow(scale);
    const rawMinor = amount
      .mul(factor)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

    return this.toSafeMinorNumber(rawMinor);
  }

  /**
   * Re-express integer minor units at a different scale, preserving monetary value.
   * Example: -1000 at scale 2 (=-10.00) -> -10000 at scale 3.
   */
  normalizeMinorUnits(
    value: number,
    fromScale: number,
    toScale: number,
  ): number {
    if (fromScale === toScale) {
      return this.toSafeMinorNumber(
        new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP),
      );
    }

    return this.toMinorUnits(
      this.fromMinorUnitsDecimal(value, fromScale),
      toScale,
    );
  }

  /**
   * Convert amount in source currency to USD using rates (rate = units per 1 USD).
   * Returns null if conversion is not possible.
   */
  toUSD(
    amountDecimal: Decimal,
    sourceCode: string,
    rates: Rate[],
  ): Decimal | null {
    if (sourceCode === 'USD') {
      return amountDecimal;
    }
    if (rates.length === 0) return null;

    const rateMap = new Map<string, Decimal>(
      rates.map((r) => [r.code, new Decimal(r.value)]),
    );

    const sourceRate = rateMap.get(sourceCode);
    if (!sourceRate) return null;

    return amountDecimal.div(sourceRate);
  }

  /**
   * Convert amount in USD to target currency using rates (rate = units per 1 USD).
   * Returns null if conversion is not possible.
   */
  fromUSD(
    amountInUSD: Decimal,
    targetCurrency: CurrencyDocument,
    rates: Rate[],
  ): Decimal | null {
    if (targetCurrency.code === 'USD') {
      return amountInUSD;
    }

    if (rates.length === 0) return null;

    const rateMap = new Map<string, Decimal>(
      rates.map((r) => [r.code, new Decimal(r.value)]),
    );

    const targetRate = rateMap.get(targetCurrency.code);
    if (!targetRate) return null;

    return amountInUSD.mul(targetRate);
  }

  /**
   * Round Decimal amount to given scale and return decimal + minor units.
   */
  roundToScale(
    amount: Decimal,
    scale: number,
  ): { rounded: Decimal; rawMinor: number } {
    const rounded = amount.toDecimalPlaces(scale, Decimal.ROUND_HALF_UP);
    const rawMinor = this.toMinorUnits(rounded, scale);

    return { rounded, rawMinor };
  }

  /**
   * Convert amount from source currency to target using rates (rate = units per 1 USD).
   * Returns converted value and raw in minor units, or null if conversion not possible.
   */
  convertAmount(
    amountDecimal: Decimal,
    sourceCode: string,
    rates: Rate[],
    targetCurrency?: CurrencyDocument,
  ): MoneyViewDto | null {
    if (!targetCurrency) {
      return null;
    }

    const amountInUSD = this.toUSD(amountDecimal, sourceCode, rates);
    if (!amountInUSD) return null;

    const amountInTarget = this.fromUSD(amountInUSD, targetCurrency, rates);
    if (!amountInTarget) return null;

    const scale = targetCurrency.decimal_digits ?? 0;

    const { rounded, rawMinor } = this.roundToScale(amountInTarget, scale);

    return {
      value: rounded.toNumber(),
      raw: rawMinor,
      scale,
      currency: {
        id: targetCurrency._id.toString(),
        code: targetCurrency.code,
        symbol: targetCurrency.symbol,
        decimal_digits: targetCurrency.decimal_digits,
      },
    };
  }
}
