import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { TransactionType } from './transaction.enum';

export type TransactionDocument = HydratedDocument<Transaction>;

/**
 * Mongoose schema for Transaction entity.
 * Represents a single income or expense entry linked to user, account, and category.
 */
@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: Types.ObjectId;

  @Prop({
    type: String,
    enum: TransactionType,
    required: true,
    index: true,
  })
  type: TransactionType;

  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  })
  category: Types.ObjectId;

  @Prop({ trim: true, maxlength: 500, default: '' })
  comment: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true,
  })
  account: Types.ObjectId;

  /** Amount in minor units (e.g. cents for USD). Positive for income, negative for expense. */
  @Prop({ required: true, type: Number })
  amount: number;

  /** Number of decimal places for the amount (same as account scale). */
  @Prop({ required: true, type: Number, min: 0, max: 18 })
  scale: number;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Tag' }],
    default: [],
  })
  tags: Types.ObjectId[];

  /** Transaction date only, ISO date string YYYY-MM-DD. No default. */
  @Prop({ type: String, required: true, index: true })
  date: string;

  createdAt: Date;
  updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ user: 1, date: -1 });
