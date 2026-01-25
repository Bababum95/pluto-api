import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CurrencyDocument = Currency & Document;

@Schema({ timestamps: true, collection: 'currencies' })
export class Currency {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  symbol: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  symbol_native: string;

  @Prop({ required: true })
  decimal_digits: number;

  @Prop({ required: true })
  rounding: number;

  @Prop({ required: true })
  name_plural: string;

  @Prop({ required: true, enum: ['fiat', 'crypto'] })
  type: string;

  @Prop({ type: [String], required: true })
  countries: string[];
}

export const CurrencySchema = SchemaFactory.createForClass(Currency);