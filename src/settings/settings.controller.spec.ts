import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import type { RequestUser } from '../auth/auth.dto';
import type { UpdateSettingsDto, SettingsDto } from './settings.dto';

jest.mock('./settings.service', () => ({
  SettingsService: jest.fn(),
}));

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: {
    findOneOrFail: jest.Mock;
    update: jest.Mock;
    toSettingsDto: jest.Mock;
  };

  const mockUser: RequestUser = {
    userId: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
  };

  const mockSettingsDto: SettingsDto = {
    id: '507f1f77bcf86cd799439020',
    currency: {
      id: '507f1f77bcf86cd799439013',
      code: 'USD',
      symbol: '$',
      name: 'US Dollar',
      symbol_native: '$',
      decimal_digits: 2,
      rounding: 0,
      name_plural: 'US dollars',
      type: 'fiat',
    },
    account: null,
    createdAt: '2021-01-01T10:00:00.000Z',
    updatedAt: '2021-01-01T10:00:00.000Z',
  };

  beforeEach(async () => {
    const mockSettingsService = {
      findOneOrFail: jest.fn(),
      update: jest.fn(),
      toSettingsDto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: mockSettingsService }],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
    service = module.get(SettingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findOne', () => {
    it('should return SettingsDto for current user', async () => {
      const mockSettings = {};
      service.findOneOrFail.mockResolvedValue(mockSettings);
      service.toSettingsDto.mockReturnValue(mockSettingsDto);

      const result = await controller.findOne(mockUser);

      expect(service.findOneOrFail).toHaveBeenCalledWith(mockUser.userId);
      expect(service.toSettingsDto).toHaveBeenCalledWith(mockSettings);
      expect(result).toEqual(mockSettingsDto);
    });

    it('should throw NotFoundException when settings not found', async () => {
      service.findOneOrFail.mockRejectedValue(
        new NotFoundException('Settings not found'),
      );

      await expect(controller.findOne(mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update settings and return SettingsDto', async () => {
      const updateDto: UpdateSettingsDto = {
        currency: '507f1f77bcf86cd799439013',
      };
      const updated = {};
      const updatedDto = {
        ...mockSettingsDto,
        currency: { ...mockSettingsDto.currency, code: 'EUR' },
      };
      service.update.mockResolvedValue(updated);
      service.toSettingsDto.mockReturnValue(updatedDto);

      const result = await controller.update(mockUser, updateDto);

      expect(service.update).toHaveBeenCalledWith(mockUser.userId, updateDto);
      expect(service.toSettingsDto).toHaveBeenCalledWith(updated);
      expect(result).toEqual(updatedDto);
    });
  });
});
