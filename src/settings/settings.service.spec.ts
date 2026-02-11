import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { Types } from 'mongoose';

import { Settings, SettingsDocument } from './settings.schema';
import { Account, AccountDocument } from '../account/account.schema';
import { CurrencyDocument } from '../currency/currency.schema';
import { CurrencyService } from '../currency/currency.service';
import { AccountService } from '../account/account.service';
import { SettingsService } from './settings.service';
import type { UpdateSettingsDto } from './settings.dto';

const mockI18nService = {
  t: (key: string): string => {
    const messages: Record<string, string> = {
      'settings.errors.notFound': 'Settings not found',
      'settings.errors.currencyNotFound': 'Currency not found',
      'settings.errors.accountNotFound': 'Account not found',
      'settings.create.failed': 'Failed to create default settings',
    };
    return messages[key] ?? key;
  },
};

const userId = '507f1f77bcf86cd799439011';
const settingsId = new Types.ObjectId('507f1f77bcf86cd799439020');
const currencyId = new Types.ObjectId('507f1f77bcf86cd799439013');
const accountId = new Types.ObjectId('507f1f77bcf86cd799439012');

const mockCurrency: CurrencyDocument = {
  _id: currencyId,
  code: 'USD',
  symbol: '$',
  name: 'US Dollar',
  symbol_native: '$',
  decimal_digits: 2,
  rounding: 0,
  name_plural: 'US dollars',
  type: 'fiat',
  countries: ['US'],
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as CurrencyDocument;

const mockAccount: AccountDocument = {
  _id: accountId,
  user: new Types.ObjectId(userId),
  color: '#FF5733',
  icon: 'wallet',
  name: 'Main Wallet',
  balance: 100050,
  scale: 2,
  currency: mockCurrency,
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as AccountDocument;

const mockSettings: SettingsDocument = {
  _id: settingsId,
  user: new Types.ObjectId(userId),
  currency: mockCurrency,
  account: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as SettingsDocument;

const createChain = (resolvedValue: unknown) => ({
  exec: jest.fn().mockResolvedValue(resolvedValue),
  populate: jest.fn().mockReturnThis(),
});

describe('SettingsService', () => {
  let service: SettingsService;
  let mockSettingsModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findById: jest.Mock;
  };
  let saveMock: jest.Mock;
  let mockCurrencyService: {
    findByCode: jest.Mock;
    findOne: jest.Mock;
    toCurrencyDto: jest.Mock;
  };
  let mockAccountService: {
    findOne: jest.Mock;
    toAccountDto: jest.Mock;
  };

  beforeEach(async () => {
    saveMock = jest.fn().mockResolvedValue(undefined);
    const MockSettingsModel = function (
      this: unknown,
      dto?: Record<string, unknown>,
    ) {
      const instance = {
        _id: settingsId,
        ...dto,
        save: saveMock,
      };
      if (new.target) {
        Object.assign(this ?? {}, instance);
        return this;
      }
      return instance;
    } as unknown as typeof mockSettingsModel & {
      findOne: jest.Mock;
      findOneAndUpdate: jest.Mock;
      findById: jest.Mock;
    };

    (MockSettingsModel as unknown as { findOne: jest.Mock }).findOne =
      jest.fn();
    (
      MockSettingsModel as unknown as { findOneAndUpdate: jest.Mock }
    ).findOneAndUpdate = jest.fn();
    (MockSettingsModel as unknown as { findById: jest.Mock }).findById =
      jest.fn();

    mockCurrencyService = {
      findByCode: jest.fn().mockResolvedValue(mockCurrency),
      findOne: jest.fn().mockResolvedValue(mockCurrency),
      toCurrencyDto: jest.fn((c: CurrencyDocument) => ({
        id: c._id.toString(),
        code: c.code,
        symbol: c.symbol,
        name: c.name,
      })),
    };

    mockAccountService = {
      findOne: jest.fn().mockResolvedValue(mockAccount),
      toAccountDto: jest.fn((a: AccountDocument) => ({
        id: a._id.toString(),
        name: a.name,
      })),
    };

    const chainWithPopulate = {
      ...createChain(mockSettings),
      populate: jest.fn().mockReturnThis(),
    };

    (
      MockSettingsModel as unknown as { findOne: jest.Mock }
    ).findOne.mockReturnValue(createChain(null));
    (
      MockSettingsModel as unknown as { findOneAndUpdate: jest.Mock }
    ).findOneAndUpdate.mockReturnValue(createChain(null));
    (
      MockSettingsModel as unknown as { findById: jest.Mock }
    ).findById.mockReturnValue(chainWithPopulate);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: getModelToken(Settings.name),
          useValue: MockSettingsModel,
        },
        {
          provide: getModelToken(Account.name),
          useValue: {},
        },
        {
          provide: CurrencyService,
          useValue: mockCurrencyService,
        },
        {
          provide: AccountService,
          useValue: mockAccountService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    mockSettingsModel = module.get(getModelToken(Settings.name));
    jest.clearAllMocks();

    mockCurrencyService.findByCode.mockResolvedValue(mockCurrency);
    mockSettingsModel.findOne.mockReturnValue(createChain(null));
    mockSettingsModel.findOneAndUpdate.mockReturnValue(createChain(null));
    mockSettingsModel.findById.mockReturnValue({
      ...createChain(mockSettings),
      populate: jest.fn().mockReturnThis(),
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDefault', () => {
    it('should create default settings with USD currency and null account', async () => {
      mockSettingsModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockSettings,
          currency: mockCurrency,
          account: null,
        }),
        populate: jest.fn().mockReturnThis(),
      });

      const result = await service.createDefault(userId);

      expect(mockCurrencyService.findByCode).toHaveBeenCalledWith('USD');
      expect(saveMock).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw when USD currency is not found', async () => {
      mockCurrencyService.findByCode.mockResolvedValue(null);

      await expect(service.createDefault(userId)).rejects.toThrow();
      await expect(service.createDefault(userId)).rejects.toThrow('USD');
    });
  });

  describe('findByUserId', () => {
    it('should return settings when found', async () => {
      mockSettingsModel.findOne.mockReturnValue({
        ...createChain(mockSettings),
        populate: jest.fn().mockReturnThis(),
      });

      const result = await service.findByUserId(userId);

      expect(mockSettingsModel.findOne).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(mockSettings);
    });

    it('should return null when settings not found', async () => {
      mockSettingsModel.findOne.mockReturnValue(createChain(null));

      const result = await service.findByUserId(userId);

      expect(result).toBeNull();
    });
  });

  describe('findOneOrFail', () => {
    it('should return settings when found', async () => {
      mockSettingsModel.findOne.mockReturnValue({
        ...createChain(mockSettings),
        populate: jest.fn().mockReturnThis(),
      });

      const result = await service.findOneOrFail(userId);

      expect(result).toEqual(mockSettings);
    });

    it('should throw NotFoundException when settings not found', async () => {
      mockSettingsModel.findOne.mockReturnValue(createChain(null));

      await expect(service.findOneOrFail(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOneOrFail(userId)).rejects.toThrow(
        'Settings not found',
      );
    });
  });

  describe('update', () => {
    it('should update currency and return settings', async () => {
      const updateDto: UpdateSettingsDto = { currency: currencyId.toString() };
      const updated = { ...mockSettings, currency: mockCurrency };
      mockSettingsModel.findOne.mockReturnValue({
        ...createChain(mockSettings),
        populate: jest.fn().mockReturnThis(),
      });
      mockSettingsModel.findOneAndUpdate.mockReturnValue({
        ...createChain(updated),
        populate: jest.fn().mockReturnThis(),
      });

      const result = await service.update(userId, updateDto);

      expect(mockSettingsModel.findOneAndUpdate).toHaveBeenCalledWith(
        { user: new Types.ObjectId(userId) },
        { currency: currencyId },
        { new: true },
      );
      expect(result).toBeDefined();
    });

    it('should update account to null', async () => {
      const updateDto: UpdateSettingsDto = { account: null };
      const updated = { ...mockSettings, account: null };
      mockSettingsModel.findOne.mockReturnValue({
        ...createChain(mockSettings),
        populate: jest.fn().mockReturnThis(),
      });
      mockSettingsModel.findOneAndUpdate.mockReturnValue({
        ...createChain(updated),
        populate: jest.fn().mockReturnThis(),
      });

      await service.update(userId, updateDto);

      expect(mockSettingsModel.findOneAndUpdate).toHaveBeenCalledWith(
        { user: new Types.ObjectId(userId) },
        { account: null },
        { new: true },
      );
    });

    it('should throw NotFoundException when settings not found', async () => {
      mockSettingsModel.findOne.mockReturnValue(createChain(null));

      await expect(
        service.update(userId, { currency: currencyId.toString() }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when account not found', async () => {
      mockAccountService.findOne.mockResolvedValue(null);
      mockSettingsModel.findOne.mockReturnValue({
        ...createChain(mockSettings),
        populate: jest.fn().mockReturnThis(),
      });

      await expect(
        service.update(userId, { account: accountId.toString() }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update(userId, { account: accountId.toString() }),
      ).rejects.toThrow('Account not found');
    });
  });

  describe('toSettingsDto', () => {
    it('should convert SettingsDocument to SettingsDto', () => {
      const settingsWithAccount = { ...mockSettings, account: mockAccount };
      const dto = service.toSettingsDto(
        settingsWithAccount as SettingsDocument,
      );

      expect(mockCurrencyService.toCurrencyDto).toHaveBeenCalledWith(
        mockCurrency,
      );
      expect(mockAccountService.toAccountDto).toHaveBeenCalledWith(mockAccount);
      expect(dto.id).toBe(settingsId.toString());
      expect(dto.currency).toBeDefined();
      expect(dto.account).toBeDefined();
      expect(dto.createdAt).toBeDefined();
      expect(dto.updatedAt).toBeDefined();
    });

    it('should return null account when settings have no account', () => {
      const dto = service.toSettingsDto(mockSettings);

      expect(dto.account).toBeNull();
    });
  });
});
