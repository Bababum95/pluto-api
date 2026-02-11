import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import type { CurrencyDocument } from '../currency/currency.schema';
import type { AccountDocument } from '../account/account.schema';

export type SettingsDocument = HydratedDocument<Settings> & {
  currency: CurrencyDocument;
  account: AccountDocument | null;
};

/**
 * User settings: one document per user (created on registration).
 * Default currency USD, default account null.
 */
@Schema({ timestamps: true, collection: 'settings' })
export class Settings {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  user: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Currency',
    required: true,
  })
  currency: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Account',
    default: null,
  })
  account: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
