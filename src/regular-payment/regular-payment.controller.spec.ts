import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { TransactionType } from '../transaction/transaction.enum';
import type { RequestUser } from '../auth/auth.dto';

import { RegularPaymentController } from './regular-payment.controller';
import { RegularPaymentService } from './regular-payment.service';
import { SettingsService } from '../settings/settings.service';
import { RateService } from '../rate/rate.service';
import type {
  CreateRegularPaymentDto,
  UpdateRegularPaymentDto,
  RegularPaymentDto,
} from './regular-payment.dto';

describe('RegularPaymentController', () => {
  let controller: RegularPaymentController;
  let regularPaymentService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    toRegularPaymentDto: jest.Mock;
  };
  let settingsService: { findByUserId: jest.Mock };
  let rateService: { getLatestValidRate: jest.Mock };

  const mockUser: RequestUser = {
    userId: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
  };

  const mockRegularPayment = {
    _id: '507f1f77bcf86cd799439099',
    user: mockUser.userId,
    type: TransactionType.EXPENSE,
    category: '507f1f77bcf86cd799439012',
    account: '507f1f77bcf86cd799439013',
    amount: -150050,
    scale: 2,
    comment: 'Monthly rent',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRegularPaymentDto: RegularPaymentDto = {
    id: mockRegularPayment._id,
    type: TransactionType.EXPENSE,
    category: {
      id: 'cat1',
      name: 'Rent',
      color: '#333',
      icon: 'home',
      type: TransactionType.EXPENSE,
      order: 0,
      createdAt: '',
      updatedAt: '',
    },
    account: {
      id: 'acc1',
      name: 'Main',
      balance: { original: {}, converted: {} },
      currency: { code: 'USD' },
      createdAt: '',
      updatedAt: '',
    } as never,
    comment: 'Monthly rent',
    tags: [],
    amount: {
      original: {
        value: -1500.5,
        raw: -150050,
        scale: 2,
        currency: {} as never,
      },
      converted: {
        value: -1500.5,
        raw: -150050,
        scale: 2,
        currency: {} as never,
      },
    },
    createdAt: mockRegularPayment.createdAt.toISOString(),
    updatedAt: mockRegularPayment.updatedAt.toISOString(),
  };

  const mockCreateDto: CreateRegularPaymentDto = {
    type: TransactionType.EXPENSE,
    category: '507f1f77bcf86cd799439012',
    account: '507f1f77bcf86cd799439013',
    amount: -1500.5,
    scale: 2,
    comment: 'Monthly rent',
  };

  const mockSettings = { currency: { code: 'USD' } };
  const mockRates: never[] = [];

  beforeEach(async () => {
    const mockRegularPaymentService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toRegularPaymentDto: jest.fn(),
    };

    const mockSettingsService = {
      findByUserId: jest.fn(),
    };

    const mockRateService = {
      getLatestValidRate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegularPaymentController],
      providers: [
        { provide: RegularPaymentService, useValue: mockRegularPaymentService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: RateService, useValue: mockRateService },
      ],
    }).compile();

    controller = module.get<RegularPaymentController>(RegularPaymentController);
    regularPaymentService = module.get(RegularPaymentService);
    settingsService = module.get(SettingsService);
    rateService = module.get(RateService);

    settingsService.findByUserId.mockResolvedValue(mockSettings);
    rateService.getLatestValidRate.mockResolvedValue(mockRates);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a regular payment and return RegularPaymentDto', async () => {
      regularPaymentService.create.mockResolvedValue(mockRegularPayment);
      regularPaymentService.toRegularPaymentDto.mockReturnValue(
        mockRegularPaymentDto,
      );

      const result = await controller.create(mockUser, mockCreateDto);

      expect(regularPaymentService.create).toHaveBeenCalledWith(
        mockUser.userId,
        mockCreateDto,
      );
      expect(settingsService.findByUserId).toHaveBeenCalledWith(
        mockUser.userId,
      );
      expect(rateService.getLatestValidRate).toHaveBeenCalled();
      expect(regularPaymentService.toRegularPaymentDto).toHaveBeenCalledWith(
        mockRegularPayment,
        { settings: mockSettings, rates: mockRates },
      );
      expect(result).toEqual(mockRegularPaymentDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of RegularPaymentDto for the user', async () => {
      const list = [mockRegularPayment];
      regularPaymentService.findAll.mockResolvedValue(list);
      regularPaymentService.toRegularPaymentDto.mockReturnValue(
        mockRegularPaymentDto,
      );

      const result = await controller.findAll(mockUser);

      expect(regularPaymentService.findAll).toHaveBeenCalledWith(
        mockUser.userId,
      );
      expect(settingsService.findByUserId).toHaveBeenCalledWith(
        mockUser.userId,
      );
      expect(rateService.getLatestValidRate).toHaveBeenCalled();
      expect(regularPaymentService.toRegularPaymentDto).toHaveBeenCalledWith(
        mockRegularPayment,
        { settings: mockSettings, rates: mockRates },
      );
      expect(result).toEqual([mockRegularPaymentDto]);
    });
  });

  describe('findOne', () => {
    it('should return a RegularPaymentDto by id', async () => {
      regularPaymentService.findOne.mockResolvedValue(mockRegularPayment);
      regularPaymentService.toRegularPaymentDto.mockReturnValue(
        mockRegularPaymentDto,
      );

      const result = await controller.findOne(mockUser, mockRegularPayment._id);

      expect(regularPaymentService.findOne).toHaveBeenCalledWith(
        mockUser.userId,
        mockRegularPayment._id,
      );
      expect(settingsService.findByUserId).toHaveBeenCalledWith(
        mockUser.userId,
      );
      expect(rateService.getLatestValidRate).toHaveBeenCalled();
      expect(result).toEqual(mockRegularPaymentDto);
    });

    it('should throw NotFoundException when regular payment not found', async () => {
      regularPaymentService.findOne.mockResolvedValue(null);

      await expect(controller.findOne(mockUser, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(regularPaymentService.toRegularPaymentDto).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a regular payment and return RegularPaymentDto', async () => {
      const updateDto: UpdateRegularPaymentDto = { comment: 'Updated rent' };
      const updated = { ...mockRegularPayment, comment: 'Updated rent' };
      const updatedDto = { ...mockRegularPaymentDto, comment: 'Updated rent' };
      regularPaymentService.update.mockResolvedValue(updated);
      regularPaymentService.toRegularPaymentDto.mockReturnValue(updatedDto);

      const result = await controller.update(
        mockUser,
        mockRegularPayment._id,
        updateDto,
      );

      expect(regularPaymentService.update).toHaveBeenCalledWith(
        mockUser.userId,
        mockRegularPayment._id,
        updateDto,
      );
      expect(regularPaymentService.toRegularPaymentDto).toHaveBeenCalledWith(
        updated,
        { settings: mockSettings, rates: mockRates },
      );
      expect(result).toEqual(updatedDto);
    });
  });

  describe('remove', () => {
    it('should remove a regular payment and return void', async () => {
      regularPaymentService.remove.mockResolvedValue(true);

      await controller.remove(mockUser, mockRegularPayment._id);

      expect(regularPaymentService.remove).toHaveBeenCalledWith(
        mockUser.userId,
        mockRegularPayment._id,
      );
    });
  });
});
