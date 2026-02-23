import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TagDocument = HydratedDocument<Tag>;

/**
 * Mongoose schema for Tag entity.
 * Each tag belongs to a specific user and can be used to label transactions.
 */
@Schema({ timestamps: true, collection: 'tags' })
export class Tag {
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
    minlength: 1,
    maxlength: 20,
  })
  name: string;

  @Prop({ trim: true })
  color: string;

  @Prop({ trim: true })
  icon: string;

  createdAt: Date;
  updatedAt: Date;
}

export const TagSchema = SchemaFactory.createForClass(Tag);

TagSchema.index({ user: 1, name: 1 }, { unique: true });
