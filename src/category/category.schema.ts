import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

/**
 * Mongoose schema for Category entity
 * Each category belongs to a specific user
 */
@Schema({ timestamps: true, collection: 'categories' })
export class Category {
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

  createdAt: Date;
  updatedAt: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Compound index to ensure unique category names per user
CategorySchema.index({ user: 1, name: 1 }, { unique: true });
