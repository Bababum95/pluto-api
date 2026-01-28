import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RateDocument = Rate & Document;

/**
 * Mongoose schema for Rate entity
 */
@Schema({ timestamps: true, collection: 'rates' })
export class Rate {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  value: number;

  createdAt: Date;
  updatedAt: Date;
}

export const RateSchema = SchemaFactory.createForClass(Rate);
