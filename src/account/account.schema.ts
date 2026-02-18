import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { CurrencyDocument } from '../currency/currency.schema';

export type AccountDocument = HydratedDocument<Account> & {
  currency: CurrencyDocument;
};

/**
 * Mongoose schema for Account entity
 * Each account belongs to a specific user
 */
@Schema({ timestamps: true, collection: 'accounts' })
export class Account {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  color: string;

  @Prop({
    required: true,
    trim: true,
  })
  icon: string;

  @Prop({
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 100,
  })
  name: string;

  @Prop({
    required: false,
    trim: true,
    maxlength: 500,
  })
  description?: string;

  @Prop({
    required: true,
    type: Number,
    default: 0,
  })
  balance: number; // Stored in minor units (e.g., cents for USD)

  @Prop({
    required: true,
    type: Number,
    min: 0,
    max: 18,
  })
  scale: number; // Number of decimal places for the currency

  @Prop({
    type: Types.ObjectId,
    ref: 'Currency',
    required: true,
    index: true,
  })
  currency: Types.ObjectId;

  @Prop({
    required: true,
    type: Number,
    default: 0,
  })
  order: number; // Order for sorting accounts per user

  @Prop({
    required: true,
    type: Boolean,
    default: false,
  })
  excluded: boolean; // Whether the account is excluded from the total balance

  createdAt: Date;
  updatedAt: Date;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

AccountSchema.index({ user: 1, name: 1 }, { unique: false });
