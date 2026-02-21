import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import type { CreateTagDto, UpdateTagDto } from './tag.dto';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';
import type { RequestUser } from '../auth/auth.dto';

jest.mock('./tag.service', () => ({
  TagService: jest.fn(),
}));

type MockedTag = {
  _id: string;
  user: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
};

describe('TagController', () => {
  let controller: TagController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    toTagDto: jest.Mock;
  };

  const mockUser: RequestUser = {
    userId: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
  };

  const mockTag: MockedTag = {
    _id: '507f1f77bcf86cd799439012',
    user: mockUser.userId,
    name: 'food',
    color: '#6B7280',
    icon: 'tag',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTagDto = {
    id: mockTag._id,
    name: mockTag.name,
    color: mockTag.color,
    icon: mockTag.icon,
    createdAt: mockTag.createdAt.toISOString(),
    updatedAt: mockTag.updatedAt.toISOString(),
  };

  const mockCreateDto: CreateTagDto = {
    name: 'food',
  };

  beforeEach(async () => {
    const mockTagService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toTagDto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagController],
      providers: [{ provide: TagService, useValue: mockTagService }],
    }).compile();

    controller = module.get<TagController>(TagController);
    service = module.get(TagService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a tag and return TagDto', async () => {
      service.create.mockResolvedValue(mockTag);
      service.toTagDto.mockReturnValue(mockTagDto);

      const result = await controller.create(mockUser, mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(
        mockUser.userId,
        mockCreateDto,
      );
      expect(service.toTagDto).toHaveBeenCalledWith(mockTag);
      expect(result).toEqual(mockTagDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of TagDto for the user', async () => {
      const list = [mockTag];
      service.findAll.mockResolvedValue(list);
      service.toTagDto.mockReturnValue(mockTagDto);

      const result = await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.userId);
      expect(service.toTagDto).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockTagDto]);
    });
  });

  describe('findOne', () => {
    it('should return a TagDto by id', async () => {
      service.findOne.mockResolvedValue(mockTag);
      service.toTagDto.mockReturnValue(mockTagDto);

      const result = await controller.findOne(mockUser, mockTag._id);

      expect(service.findOne).toHaveBeenCalledWith(
        mockUser.userId,
        mockTag._id,
      );
      expect(service.toTagDto).toHaveBeenCalledWith(mockTag);
      expect(result).toEqual(mockTagDto);
    });

    it('should throw NotFoundException when tag not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne(mockUser, 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a tag and return TagDto', async () => {
      const updateDto: UpdateTagDto = { name: 'Updated Name' };
      const updated = { ...mockTag, name: 'Updated Name' };
      const updatedDto = { ...mockTagDto, name: 'Updated Name' };
      service.update.mockResolvedValue(updated);
      service.toTagDto.mockReturnValue(updatedDto);

      const result = await controller.update(mockUser, mockTag._id, updateDto);

      expect(service.update).toHaveBeenCalledWith(
        mockUser.userId,
        mockTag._id,
        updateDto,
      );
      expect(service.toTagDto).toHaveBeenCalledWith(updated);
      expect(result).toEqual(updatedDto);
    });
  });

  describe('remove', () => {
    it('should remove a tag and return void', async () => {
      service.remove.mockResolvedValue(true);

      await controller.remove(mockUser, mockTag._id);

      expect(service.remove).toHaveBeenCalledWith(mockUser.userId, mockTag._id);
    });
  });
});
