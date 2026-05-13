import { NotFoundException, ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { Model, Types } from 'mongoose';

import { Tag, TagDocument } from './tag.schema';
import { TagService } from './tag.service';
import type { CreateTagDto, UpdateTagDto } from './tag.dto';

const mockI18nService = {
  t: (key: string, options?: { defaultValue?: string }): string => {
    const messages: Record<string, string> = {
      'tag.errors.nameAlreadyExists': 'Tag with this name already exists',
      'tag.create.failed': 'Tag creation failed',
      'tag.errors.notFound': 'Tag not found',
    };
    return options?.defaultValue ?? messages[key] ?? key;
  },
};

const createChain = (resolvedValue: unknown) => ({
  exec: jest.fn().mockResolvedValue(resolvedValue),
  lean: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
});

describe('TagService', () => {
  let service: TagService;
  let mockTagModel: Model<unknown> & {
    findOne: jest.Mock;
    find: jest.Mock;
    aggregate: jest.Mock;
    findById: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOneAndDelete: jest.Mock;
  };
  let saveMock: jest.Mock;

  const userId = '507f1f77bcf86cd799439011';
  const tagId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockTag = {
    _id: tagId,
    user: new Types.ObjectId(userId),
    name: 'food',
    color: '#6B7280',
    icon: 'tag',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as TagDocument;

  beforeEach(async () => {
    saveMock = jest.fn().mockResolvedValue(undefined);
    const MockModel = function (this: unknown, dto?: CreateTagDto) {
      const instance = {
        _id: mockTag._id,
        user: new Types.ObjectId(userId),
        ...dto,
        save: saveMock,
      };
      if (new.target) {
        Object.assign(this ?? {}, instance);
        return this;
      }
      return instance;
    } as unknown as Model<unknown> & {
      findOne: jest.Mock;
      find: jest.Mock;
      aggregate: jest.Mock;
      findById: jest.Mock;
      findOneAndUpdate: jest.Mock;
      findOneAndDelete: jest.Mock;
    };

    const chainNull = createChain(null);

    MockModel.findOne = jest.fn().mockReturnValue(chainNull);
    MockModel.find = jest.fn().mockReturnValue(createChain([]));
    MockModel.aggregate = jest.fn().mockReturnValue(createChain([]));
    MockModel.findById = jest.fn().mockReturnValue(chainNull);
    MockModel.findOneAndUpdate = jest.fn().mockReturnValue(chainNull);
    MockModel.findOneAndDelete = jest.fn().mockReturnValue(chainNull);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagService,
        {
          provide: getModelToken(Tag.name),
          useValue: MockModel,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<TagService>(TagService);
    mockTagModel = module.get(getModelToken(Tag.name));
    jest.clearAllMocks();

    MockModel.findOne.mockReturnValue(createChain(null));
    MockModel.find.mockReturnValue(createChain([]));
    MockModel.aggregate.mockReturnValue(createChain([]));
    MockModel.findById.mockReturnValue(createChain(null));
    MockModel.findOneAndUpdate.mockReturnValue(createChain(null));
    MockModel.findOneAndDelete.mockReturnValue(createChain(null));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a tag and return it', async () => {
      const createDto: CreateTagDto = {
        name: 'food',
      };
      mockTagModel.findById.mockReturnValue(createChain(mockTag));

      const result = await service.create(userId, createDto);

      expect(mockTagModel.findOne).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
        name: 'food',
      });
      expect(saveMock).toHaveBeenCalled();
      expect(mockTagModel.findById).toHaveBeenCalledWith(tagId);
      expect(result).toEqual(mockTag);
    });

    it('should create a tag with optional color and icon', async () => {
      const createDto: CreateTagDto = {
        name: 'restaurant',
        color: '#FF5733',
        icon: 'utensils',
      };
      mockTagModel.findById.mockReturnValue(
        createChain({ ...mockTag, ...createDto }),
      );

      const result = await service.create(userId, createDto);

      expect(mockTagModel.findOne).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
        name: 'restaurant',
      });
      expect(saveMock).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ConflictException when tag name already exists', async () => {
      const createDto: CreateTagDto = { name: 'food' };
      mockTagModel.findOne.mockReturnValue(createChain(mockTag));

      await expect(service.create(userId, createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(userId, createDto)).rejects.toThrow(
        'Tag with this name already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of tags for the user', async () => {
      const list = [mockTag];
      mockTagModel.aggregate.mockReturnValue(createChain(list));

      const result = await service.findAll(userId);

      expect(mockTagModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual(list);
    });
  });

  describe('findOne', () => {
    it('should return a tag by id for the user', async () => {
      mockTagModel.findOne.mockReturnValue(createChain(mockTag));

      const result = await service.findOne(userId, tagId.toString());

      expect(mockTagModel.findOne).toHaveBeenCalledWith({
        _id: tagId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(mockTag);
    });

    it('should return null when tag not found', async () => {
      mockTagModel.findOne.mockReturnValue(createChain(null));

      const result = await service.findOne(userId, 'invalid');

      expect(result).toBeNull();
    });
  });

  describe('findByIds', () => {
    it('should return tags by ids for the user', async () => {
      const tagId2 = new Types.ObjectId('507f1f77bcf86cd799439013');
      const list = [mockTag, { ...mockTag, _id: tagId2 }];
      mockTagModel.find.mockReturnValue(createChain(list));

      const result = await service.findByIds(userId, [
        tagId.toString(),
        tagId2.toString(),
      ]);

      expect(mockTagModel.find).toHaveBeenCalledWith({
        _id: { $in: [tagId, tagId2] },
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(list);
    });

    it('should return empty array when ids is empty', async () => {
      const result = await service.findByIds(userId, []);

      expect(mockTagModel.find).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return empty array when all ids are invalid', async () => {
      const result = await service.findByIds(userId, ['invalid', '']);

      expect(mockTagModel.find).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a tag and return it', async () => {
      const updateDto: UpdateTagDto = { name: 'Updated Name' };
      const updated = { ...mockTag, name: 'Updated Name' };
      mockTagModel.findOneAndUpdate.mockReturnValue(createChain(updated));

      const result = await service.update(userId, tagId.toString(), updateDto);

      expect(mockTagModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: tagId.toString(),
          user: new Types.ObjectId(userId),
        },
        { name: 'Updated Name' },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when tag not found', async () => {
      mockTagModel.findOneAndUpdate.mockReturnValue(createChain(null));

      await expect(
        service.update(userId, 'invalid', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new name already exists', async () => {
      const updateDto: UpdateTagDto = { name: 'Existing Name' };
      mockTagModel.findOne.mockReturnValue(
        createChain({ _id: 'other-id', name: 'Existing Name' }),
      );

      await expect(
        service.update(userId, tagId.toString(), updateDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove a tag and return true', async () => {
      mockTagModel.findOneAndDelete.mockReturnValue(createChain(mockTag));

      const result = await service.remove(userId, tagId.toString());

      expect(mockTagModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: tagId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(result).toBe(true);
    });

    it('should throw NotFoundException when tag not found', async () => {
      mockTagModel.findOneAndDelete.mockReturnValue(createChain(null));

      await expect(service.remove(userId, 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('incrementUsageCount', () => {
    it('should increment usage count and update last used date', async () => {
      mockTagModel.findOneAndUpdate.mockReturnValue(createChain(mockTag));

      await service.incrementUsageCount(userId, tagId.toString());

      type UsageIncrementCall = [
        { _id: string; user: Types.ObjectId },
        { $inc: { usageCount: number }; lastUsedAt: Date },
        { new: boolean },
      ];

      const call = mockTagModel.findOneAndUpdate.mock.calls[0] as unknown as
        | UsageIncrementCall
        | undefined;

      expect(call).toBeDefined();
      expect(call![0]).toEqual({
        _id: tagId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(call![1].$inc).toEqual({ usageCount: 1 });
      expect(call![1].lastUsedAt).toBeInstanceOf(Date);
      expect(call![2]).toEqual({ new: true });
    });

    it('should resolve even when tag is not found', async () => {
      mockTagModel.findOneAndUpdate.mockReturnValue(createChain(null));

      await expect(
        service.incrementUsageCount(userId, tagId.toString()),
      ).resolves.toBeUndefined();
      expect(mockTagModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('toTagDto', () => {
    it('should convert TagDocument to TagDto', () => {
      const dto = service.toTagDto(mockTag);

      expect(dto).toEqual({
        id: mockTag._id.toString(),
        name: mockTag.name,
        color: mockTag.color,
        icon: mockTag.icon,
        createdAt: mockTag.createdAt.toISOString(),
        updatedAt: mockTag.updatedAt.toISOString(),
      });
    });
  });
});
