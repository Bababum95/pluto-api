import { Test, TestingModule } from '@nestjs/testing';

import type { CreateCurrencyDto, UpdateCurrencyDto } from './currency.dto';
import { CurrencyType } from './currency.types';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';

jest.mock('./currency.service', () => ({
  CurrencyService: jest.fn(),
}));

type MockedCurrency = {
  _id: string;
  code: string;
  symbol: string;
  name: string;
  symbol_native: string;
  decimal_digits: number;
  rounding: number;
  name_plural: string;
  type: CurrencyType;
  countries: string[];
};

describe('CurrencyController', () => {
  let controller: CurrencyController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    sync: jest.Mock;
  };

  const mockCurrency: MockedCurrency = {
    _id: '507f1f77bcf86cd799439011',
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    symbol_native: '$',
    decimal_digits: 2,
    rounding: 0,
    name_plural: 'US dollars',
    type: CurrencyType.FIAT,
    countries: ['US'],
  };

  const mockCurrencyDto = {
    id: mockCurrency._id,
    code: mockCurrency.code,
    symbol: mockCurrency.symbol,
    name: mockCurrency.name,
    symbol_native: mockCurrency.symbol_native,
    decimal_digits: mockCurrency.decimal_digits,
    rounding: mockCurrency.rounding,
    name_plural: mockCurrency.name_plural,
    type: mockCurrency.type,
  };

  const mockCreateDto: CreateCurrencyDto = {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    symbol_native: '$',
    decimal_digits: 2,
    rounding: 0,
    name_plural: 'US dollars',
    type: CurrencyType.FIAT,
    countries: ['US'],
  };

  beforeEach(async () => {
    const mockCurrencyService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      sync: jest.fn(),
      toCurrencyDto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurrencyController],
      providers: [{ provide: CurrencyService, useValue: mockCurrencyService }],
    }).compile();

    controller = module.get<CurrencyController>(CurrencyController);
    service = module.get(CurrencyService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a currency and return it', async () => {
      service.create.mockResolvedValue(mockCurrency);
      service.toCurrencyDto.mockReturnValue(mockCurrencyDto);
      const result = await controller.create(mockCreateDto);
      expect(service.create).toHaveBeenCalledWith(mockCreateDto);
      expect(service.toCurrencyDto).toHaveBeenCalledWith(mockCurrency);
      expect(result).toEqual(mockCurrencyDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of currencies', async () => {
      const list = [mockCurrency];
      service.findAll.mockResolvedValue(list);
      service.toCurrencyDto.mockReturnValue(mockCurrencyDto);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(service.toCurrencyDto).toHaveBeenCalledWith(mockCurrency);
      expect(result).toEqual([mockCurrencyDto]);
    });
  });

  describe('findOne', () => {
    it('should return a currency by id', async () => {
      service.findOne.mockResolvedValue(mockCurrency);
      service.toCurrencyDto.mockReturnValue(mockCurrencyDto);
      const result = await controller.findOne(mockCurrency._id);
      expect(service.findOne).toHaveBeenCalledWith(mockCurrency._id);
      expect(service.toCurrencyDto).toHaveBeenCalledWith(mockCurrency);
      expect(result).toEqual(mockCurrencyDto);
    });

    it('should throw when currency not found', async () => {
      service.findOne.mockRejectedValue(new Error('Currency not found'));
      await expect(controller.findOne('invalid')).rejects.toThrow(
        'Currency not found',
      );
    });
  });

  describe('update', () => {
    it('should update a currency and return it', async () => {
      const updateDto: UpdateCurrencyDto = { name: 'Updated Name' };
      const updated = { ...mockCurrency, name: 'Updated Name' };
      const updatedDto = { ...mockCurrencyDto, name: 'Updated Name' };
      service.update.mockResolvedValue(updated);
      service.toCurrencyDto.mockReturnValue(updatedDto);
      const result = await controller.update(mockCurrency._id, updateDto);
      expect(service.update).toHaveBeenCalledWith(mockCurrency._id, updateDto);
      expect(service.toCurrencyDto).toHaveBeenCalledWith(updated);
      expect(result).toEqual(updatedDto);
    });

    it('should throw when currency not found', async () => {
      service.update.mockRejectedValue(new Error('Currency not found'));
      await expect(controller.update('invalid', { name: 'x' })).rejects.toThrow(
        'Currency not found',
      );
    });
  });

  describe('remove', () => {
    it('should remove a currency and return void', async () => {
      service.remove.mockResolvedValue(mockCurrency);
      const result = await controller.remove(mockCurrency._id);
      expect(service.remove).toHaveBeenCalledWith(mockCurrency._id);
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should throw when currency not found', async () => {
      service.remove.mockRejectedValue(new Error('Currency not found'));
      await expect(controller.remove('invalid')).rejects.toThrow(
        'Currency not found',
      );
    });
  });

  describe('sync', () => {
    it('should call sync and return void', async () => {
      service.sync.mockResolvedValue(undefined);
      const result = await controller.sync();
      expect(service.sync).toHaveBeenCalled();
      expect(service.sync).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should propagate sync errors', async () => {
      service.sync.mockRejectedValue(
        new Error('Failed to sync currencies: Network error'),
      );
      await expect(controller.sync()).rejects.toThrow(
        'Failed to sync currencies',
      );
    });
  });
});
