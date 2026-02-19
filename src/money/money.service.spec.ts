import Decimal from 'decimal.js';

import { MoneyService } from './money.service';
import type { Rate } from '../rate/rate.schema';
import type { CurrencyDocument } from '../currency/currency.schema';

describe('MoneyService', () => {
  let service: MoneyService;

  beforeEach(() => {
    service = new MoneyService();
  });

  it('should convert minor units to decimal', () => {
    const result = service.fromMinorUnits(150050, 2);

    expect(result).toBe(1500.5);
  });

  it('should convert minor units to Decimal', () => {
    const result = service.fromMinorUnitsDecimal(150050, 2);

    expect(result.equals(new Decimal(1500.5))).toBe(true);
  });

  it('should convert to USD when source is not USD', () => {
    const amount = new Decimal(1000);
    const rates: Rate[] = [{ code: 'EUR', value: 0.8 } as Rate];

    const result = service.toUSD(amount, 'EUR', rates);

    expect(result).not.toBeNull();
    expect(result?.toNumber()).toBeCloseTo(1250);
  });

  it('should return same amount for USD source', () => {
    const amount = new Decimal(500);
    const rates: Rate[] = [];

    const result = service.toUSD(amount, 'USD', rates);

    expect(result).toBe(amount);
  });

  it('should return null when rate for source currency is missing', () => {
    const amount = new Decimal(500);
    const rates: Rate[] = [{ code: 'EUR', value: 0.8 } as Rate];

    const result = service.toUSD(amount, 'GBP', rates);

    expect(result).toBeNull();
  });

  it('should convert from USD to target currency', () => {
    const amount = new Decimal(100);
    const targetCurrency = {
      code: 'EUR',
      symbol: '€',
      decimal_digits: 2,
    } as unknown as CurrencyDocument;
    const rates: Rate[] = [{ code: 'EUR', value: 0.8 } as Rate];

    const result = service.fromUSD(amount, targetCurrency, rates);

    expect(result).not.toBeNull();
    expect(result?.toNumber()).toBeCloseTo(80);
  });

  it('should return same amount when target currency is USD', () => {
    const amount = new Decimal(100);
    const targetCurrency = {
      code: 'USD',
      symbol: '$',
      decimal_digits: 2,
    } as unknown as CurrencyDocument;
    const rates: Rate[] = [];

    const result = service.fromUSD(amount, targetCurrency, rates);

    expect(result).toBe(amount);
  });

  it('should return null when rate for target currency is missing', () => {
    const amount = new Decimal(100);
    const targetCurrency = {
      code: 'GBP',
      symbol: '£',
      decimal_digits: 2,
    } as unknown as CurrencyDocument;
    const rates: Rate[] = [{ code: 'EUR', value: 0.8 } as Rate];

    const result = service.fromUSD(amount, targetCurrency, rates);

    expect(result).toBeNull();
  });

  it('should round amount to given scale and return raw minor units', () => {
    const amount = new Decimal('1500.505');

    const { rounded, rawMinor } = service.roundToScale(amount, 2);

    expect(rounded.toNumber()).toBe(1500.51);
    expect(rawMinor).toBe(150051);
  });

  it('should convert amount and return MoneyView', () => {
    const amountDecimal = new Decimal(1500.5);
    const sourceCode = 'USD';
    const targetCurrency = {
      _id: '507f1f77bcf86cd799439013',
      code: 'EUR',
      symbol: '€',
      decimal_digits: 2,
    } as unknown as CurrencyDocument;
    const rates: Rate[] = [{ code: 'EUR', value: 0.8 } as Rate];

    const result = service.convertAmount(
      amountDecimal,
      sourceCode,
      rates,
      targetCurrency,
    );

    expect(result).not.toBeNull();
    expect(result?.scale).toBe(2);
    expect(result?.currency).toEqual({
      id: '507f1f77bcf86cd799439013',
      code: 'EUR',
      symbol: '€',
      decimal_digits: 2,
    });
    expect(result?.raw).toBe(120040);
    expect(result?.value).toBeCloseTo(1200.4);
  });

  it('should return null when target currency is not provided', () => {
    const amountDecimal = new Decimal(1500.5);
    const sourceCode = 'USD';
    const rates: Rate[] = [];

    const result = service.convertAmount(amountDecimal, sourceCode, rates);

    expect(result).toBeNull();
  });
});
