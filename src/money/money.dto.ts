import { ApiProperty } from '@nestjs/swagger';

/** Currency view for money display (code and symbol). */
export class MoneyViewCurrencyDto {
  @ApiProperty({ example: 'USD' })
  code: string;

  @ApiProperty({ example: '$' })
  symbol: string;

  @ApiProperty({ example: 2 })
  decimal_digits: number;
}

/** Money value with decimal representation and currency. */
export class MoneyViewDto {
  @ApiProperty({ example: -1500.5, description: 'Amount in decimal form' })
  value: number;

  @ApiProperty({ example: -150050, description: 'Amount in minor units' })
  raw: number;

  @ApiProperty({ example: 2, description: 'Decimal places (scale)' })
  scale: number;

  @ApiProperty({ type: MoneyViewCurrencyDto })
  currency: MoneyViewCurrencyDto;
}
