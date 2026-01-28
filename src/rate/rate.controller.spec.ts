import { Test, TestingModule } from '@nestjs/testing';

import type { CreateRateDto, UpdateRateDto } from './rate.dto';
import { RateController } from './rate.controller';
import { RateService } from './rate.service';

jest.mock('./rate.service', () => ({
  RateService: jest.fn(),
}));

type MockedRate = {
  _id: string;
  code: string;
  value: number;
};

describe('RateController', () => {
  let controller: RateController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockRate: MockedRate = {
    _id: '507f1f77bcf86cd799439011',
    code: 'USD',
    value: 1.0,
  };

  const mockCreateDto: CreateRateDto = {
    code: 'USD',
    value: 1.0,
  };

  beforeEach(async () => {
    const mockRateService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RateController],
      providers: [{ provide: RateService, useValue: mockRateService }],
    }).compile();

    controller = module.get<RateController>(RateController);
    service = module.get(RateService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a rate and return it', async () => {
      service.create.mockResolvedValue(mockRate);
      const result = await controller.create(mockCreateDto);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRate);
    });
  });

  describe('findAll', () => {
    it('should return an array of rates', async () => {
      const list = [mockRate];
      service.findAll.mockResolvedValue(list);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(list);
    });
  });

  describe('findOne', () => {
    it('should return a rate by id', async () => {
      service.findOne.mockResolvedValue(mockRate);
      const result = await controller.findOne(mockRate._id);
      expect(service.findOne).toHaveBeenCalledWith(mockRate._id);
      expect(service.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRate);
    });

    it('should throw when rate not found', async () => {
      service.findOne.mockRejectedValue(new Error('Rate not found'));
      await expect(controller.findOne('invalid')).rejects.toThrow(
        'Rate not found',
      );
    });
  });

  describe('update', () => {
    it('should update a rate and return it', async () => {
      const updateDto: UpdateRateDto = { value: 1.5 };
      const updated = { ...mockRate, value: 1.5 };
      service.update.mockResolvedValue(updated);
      const result = await controller.update(mockRate._id, updateDto);
      expect(service.update).toHaveBeenCalledWith(mockRate._id, updateDto);
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updated);
    });

    it('should throw when rate not found', async () => {
      service.update.mockRejectedValue(new Error('Rate not found'));
      await expect(
        controller.update('invalid', { value: 1.5 }),
      ).rejects.toThrow('Rate not found');
    });
  });

  describe('remove', () => {
    it('should remove a rate and return it', async () => {
      service.remove.mockResolvedValue(mockRate);
      const result = await controller.remove(mockRate._id);
      expect(service.remove).toHaveBeenCalledWith(mockRate._id);
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRate);
    });

    it('should throw when rate not found', async () => {
      service.remove.mockRejectedValue(new Error('Rate not found'));
      await expect(controller.remove('invalid')).rejects.toThrow(
        'Rate not found',
      );
    });
  });
});
