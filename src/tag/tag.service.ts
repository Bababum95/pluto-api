import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { Tag, TagDocument } from './tag.schema';
import { CreateTagDto, UpdateTagDto, TagDto } from './tag.dto';

@Injectable()
export class TagService {
  constructor(
    @InjectModel(Tag.name)
    private readonly tagModel: Model<TagDocument>,
    private readonly i18n: I18nService,
  ) {}

  generateRandomColor(): string {
    return (
      '#' +
      Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0')
    );
  }

  async create(
    userId: string,
    createTagDto: CreateTagDto,
  ): Promise<TagDocument> {
    const existing = await this.tagModel
      .findOne({
        user: new Types.ObjectId(userId),
        name: createTagDto.name.trim(),
      })
      .exec();

    if (existing) {
      throw new ConflictException(
        this.i18n.t('tag.errors.nameAlreadyExists', {
          defaultValue: 'Tag with this name already exists',
        }),
      );
    }

    const tag = new this.tagModel({
      ...createTagDto,
      user: new Types.ObjectId(userId),
      name: createTagDto.name.trim(),
      color: createTagDto.color?.trim() ?? this.generateRandomColor(),
      icon: createTagDto.icon?.trim(),
    });

    await tag.save();
    const created = await this.tagModel.findById(tag._id).exec();
    if (!created) {
      throw new Error(
        this.i18n.t('tag.create.failed', {
          defaultValue: 'Tag creation failed',
        }),
      );
    }
    return created;
  }

  async findAll(userId: string): Promise<TagDocument[]> {
    const now = new Date();

    return this.tagModel
      .aggregate<TagDocument>([
        { $match: { user: new Types.ObjectId(userId) } },
        {
          $addFields: {
            score: {
              $add: [
                { $multiply: [{ $ifNull: ['$usageCount', 0] }, 0.3] },
                {
                  $multiply: [
                    25,
                    {
                      $divide: [
                        1,
                        {
                          $add: [
                            {
                              $divide: [
                                {
                                  $subtract: [
                                    now,
                                    { $ifNull: ['$lastUsedAt', new Date(0)] },
                                  ],
                                },
                                1000 * 60 * 60 * 24,
                              ],
                            },
                            1,
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
        { $sort: { score: -1 } },
      ])
      .exec();
  }

  async findOne(userId: string, id: string): Promise<TagDocument | null> {
    return this.tagModel
      .findOne({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .exec();
  }

  async findByIds(userId: string, ids: string[]): Promise<TagDocument[]> {
    if (!ids.length) return [];
    const objectIds = ids
      .filter((id) => id && Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (!objectIds.length) return [];
    return this.tagModel
      .find({
        _id: { $in: objectIds },
        user: new Types.ObjectId(userId),
      })
      .exec();
  }

  async update(
    userId: string,
    id: string,
    updateTagDto: UpdateTagDto,
  ): Promise<TagDocument> {
    if (updateTagDto.name) {
      const existing = await this.tagModel
        .findOne({
          user: new Types.ObjectId(userId),
          name: updateTagDto.name.trim(),
          _id: { $ne: id },
        })
        .exec();

      if (existing) {
        throw new ConflictException(
          this.i18n.t('tag.errors.nameAlreadyExists', {
            defaultValue: 'Tag with this name already exists',
          }),
        );
      }
    }

    const updateData = updateTagDto.name
      ? { ...updateTagDto, name: updateTagDto.name.trim() }
      : updateTagDto;

    const tag = await this.tagModel
      .findOneAndUpdate(
        { _id: id, user: new Types.ObjectId(userId) },
        updateData,
        { new: true },
      )
      .exec();

    if (!tag) {
      throw new NotFoundException(
        this.i18n.t('tag.errors.notFound', {
          defaultValue: 'Tag not found',
        }),
      );
    }

    return tag;
  }

  async incrementUsageCount(userId: string, id: string): Promise<void> {
    await this.tagModel
      .findOneAndUpdate(
        { _id: id, user: new Types.ObjectId(userId) },
        { $inc: { usageCount: 1 }, lastUsedAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const result = await this.tagModel
      .findOneAndDelete({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .exec();

    if (!result) {
      throw new NotFoundException(
        this.i18n.t('tag.errors.notFound', {
          defaultValue: 'Tag not found',
        }),
      );
    }

    return true;
  }

  toTagDto(tag: TagDocument): TagDto {
    return {
      id: tag._id.toString(),
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
      createdAt: tag.createdAt.toISOString(),
      updatedAt: tag.updatedAt.toISOString(),
    };
  }
}
