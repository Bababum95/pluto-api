import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PasskeyDocument = HydratedDocument<Passkey>;

/**
 * Stores WebAuthn/Passkey credentials linked to a user.
 * counter is used to detect authenticator cloning (replay attack protection).
 */
@Schema({ timestamps: true })
export class Passkey {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  /** base64url-encoded credential ID from the authenticator */
  @Prop({ required: true, unique: true })
  credentialId: string;

  /** base64url-encoded COSE public key */
  @Prop({ required: true })
  publicKey: string;

  /** Signature counter for cloning detection */
  @Prop({ required: true, default: 0 })
  counter: number;

  /** Authenticator transports (internal, usb, nfc, ble, hybrid) */
  @Prop({ type: [String], default: [] })
  transports: string[];

  /** singleDevice or multiDevice */
  @Prop({ default: null })
  deviceType: string;

  /** Human-readable label set by user or derived from user agent */
  @Prop({ default: null })
  deviceName: string;

  @Prop({ default: null })
  lastUsedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const PasskeySchema = SchemaFactory.createForClass(Passkey);
