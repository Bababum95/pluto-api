import { Test, TestingModule } from '@nestjs/testing';

import type { CreateRateDto, RateDto, UpdateRateDto } from './rate.dto';
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
    getLatestValidRate: jest.Mock;
    findOne: jest.Mock;
    findByCode: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    toRateDto: jest.Mock;
  };

  const mockRate: MockedRate = {
    _id: '507f1f77bcf86cd799439011',
    code: 'USD',
    value: 1.0,
  };

  const mockRateDto: RateDto = {
    id: mockRate._id,
    code: mockRate.code,
    value: mockRate.value,
    createdAt: '2021-01-01T10:00:00.000Z',
    updatedAt: '2021-01-01T10:00:00.000Z',
  };

  const mockCreateDto: CreateRateDto = {
    code: 'USD',
    value: 1.0,
  };

  beforeEach(async () => {
    const mockRateService = {
      create: jest.fn(),
      getLatestValidRate: jest.fn(),
      findOne: jest.fn(),
      findByCode: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toRateDto: jest.fn(),
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
      service.toRateDto.mockReturnValue(mockRateDto);
      const result = await controller.create(mockCreateDto);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto);
      expect(service.toRateDto).toHaveBeenCalledWith(mockRate);
      expect(result).toEqual(mockRateDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of rates', async () => {
      const list = [mockRate];
      service.getLatestValidRate.mockResolvedValue(list);
      service.toRateDto.mockReturnValue(mockRateDto);
      const result = await controller.findAll();
      expect(service.getLatestValidRate).toHaveBeenCalled();
      expect(service.toRateDto).toHaveBeenCalledWith(mockRate);
      expect(result).toEqual([mockRateDto]);
    });
  });

  describe('findOne', () => {
    it('should return a rate by id', async () => {
      service.findOne.mockResolvedValue(mockRate);
      service.toRateDto.mockReturnValue(mockRateDto);
      const result = await controller.findOne(mockRate._id);
      expect(service.findOne).toHaveBeenCalledWith(mockRate._id);
      expect(service.toRateDto).toHaveBeenCalledWith(mockRate);
      expect(result).toEqual(mockRateDto);
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
      const updatedDto = { ...mockRateDto, value: 1.5 };
      service.update.mockResolvedValue(updated);
      service.toRateDto.mockReturnValue(updatedDto);
      const result = await controller.update(mockRate._id, updateDto);
      expect(service.update).toHaveBeenCalledWith(mockRate._id, updateDto);
      expect(service.toRateDto).toHaveBeenCalledWith(updated);
      expect(result).toEqual(updatedDto);
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
      service.toRateDto.mockReturnValue(mockRateDto);
      const result = await controller.remove(mockRate._id);
      expect(service.remove).toHaveBeenCalledWith(mockRate._id);
      expect(service.toRateDto).toHaveBeenCalledWith(mockRate);
      expect(result).toEqual(mockRateDto);
    });

    it('should throw when rate not found', async () => {
      service.remove.mockRejectedValue(new Error('Rate not found'));
      await expect(controller.remove('invalid')).rejects.toThrow(
        'Rate not found',
      );
    });
  });
});
