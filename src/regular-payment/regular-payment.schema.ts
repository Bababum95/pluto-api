import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { TransactionType } from '../transaction/transaction.enum';

export type RegularPaymentDocument = HydratedDocument<RegularPayment>;

/**
 * Mongoose schema for RegularPayment entity.
 * Template for recurring transactions: same structure as Transaction but without date.
 * Used as a blueprint when creating actual transactions from a schedule.
 */
@Schema({ timestamps: true, collection: 'regular_payments' })
export class RegularPayment {
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

  createdAt: Date;
  updatedAt: Date;
}

export const RegularPaymentSchema =
  SchemaFactory.createForClass(RegularPayment);

RegularPaymentSchema.index({ user: 1, createdAt: -1 });
