import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TransferDocument = HydratedDocument<Transfer>;

@Schema({ _id: false })
export class TransferSide {
  @Prop({
    type: Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true,
  })
  account: Types.ObjectId;

  @Prop({ required: true, type: Number, min: 0 })
  value: number;

  @Prop({ required: true, type: Number, min: 0, max: 18 })
  scale: number;
}

export const TransferSideSchema = SchemaFactory.createForClass(TransferSide);

@Schema({ _id: false })
export class TransferFee {
  @Prop({ required: true, type: Number, min: 0, default: 0 })
  value: number;

  @Prop({ required: true, type: Number, min: 0, max: 18, default: 0 })
  scale: number;
}

export const TransferFeeSchema = SchemaFactory.createForClass(TransferFee);

/**
 * Mongoose schema for account-to-account transfer.
 * Stores both source and destination values with explicit scale and rate.
 */
@Schema({ timestamps: true, collection: 'transfers' })
export class Transfer {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: Types.ObjectId;

  @Prop({
    type: TransferSideSchema,
    required: true,
  })
  from: TransferSide;

  @Prop({
    type: TransferSideSchema,
    required: true,
  })
  to: TransferSide;

  @Prop({ required: true, type: Number, min: 0 })
  rate: number;

  @Prop({
    type: TransferFeeSchema,
    required: true,
    default: () => ({ value: 0, scale: 0 }),
  })
  fee: TransferFee;

  createdAt: Date;
  updatedAt: Date;
}

export const TransferSchema = SchemaFactory.createForClass(Transfer);

TransferSchema.index({ user: 1, createdAt: -1 });
TransferSchema.index({ user: 1, 'from.account': 1, createdAt: -1 });
TransferSchema.index({ user: 1, 'to.account': 1, createdAt: -1 });
