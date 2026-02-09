import { NotFoundException, ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { Model, Types } from 'mongoose';

import { Account, AccountDocument } from './account.schema';
import { AccountService } from './account.service';
import type { CreateAccountDto, UpdateAccountDto } from './account.dto';

const mockI18nService = {
  t: (key: string, options?: { defaultValue?: string }): string => {
    const messages: Record<string, string> = {
      'account.errors.nameAlreadyExists':
        'Account with this name already exists',
      'account.create.failed': 'Account creation failed',
      'account.errors.notFound': 'Account not found',
    };
    return options?.defaultValue ?? messages[key] ?? key;
  },
};

const createChain = (resolvedValue: unknown) => ({
  exec: jest.fn().mockResolvedValue(resolvedValue),
  lean: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
});

describe('AccountService', () => {
  let service: AccountService;
  let mockAccountModel: Model<unknown> & {
    findOne: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOneAndDelete: jest.Mock;
  };
  let saveMock: jest.Mock;

  const userId = '507f1f77bcf86cd799439011';
  const accountId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const mockAccount = {
    _id: accountId,
    user: new Types.ObjectId(userId),
    color: '#FF5733',
    icon: 'wallet',
    name: 'Main Wallet',
    balance: 100050, // Stored in minor units (1000.50 USD with scale 2)
    scale: 2,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as AccountDocument;

  beforeEach(async () => {
    saveMock = jest.fn().mockResolvedValue(undefined);
    const MockModel = function (this: unknown, dto?: CreateAccountDto) {
      const instance = {
        _id: mockAccount._id,
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
      findById: jest.Mock;
      findOneAndUpdate: jest.Mock;
      findOneAndDelete: jest.Mock;
    };

    const chainNull = createChain(null);

    MockModel.findOne = jest.fn().mockReturnValue(chainNull);
    MockModel.find = jest.fn().mockReturnValue(createChain([]));
    MockModel.findById = jest.fn().mockReturnValue(chainNull);
    MockModel.findOneAndUpdate = jest.fn().mockReturnValue(chainNull);
    MockModel.findOneAndDelete = jest.fn().mockReturnValue(chainNull);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: getModelToken(Account.name),
          useValue: MockModel,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
    mockAccountModel = module.get(getModelToken(Account.name));
    jest.clearAllMocks();

    // Restore chainable return values after clearAllMocks
    MockModel.findOne.mockReturnValue(createChain(null));
    MockModel.find.mockReturnValue(createChain([]));
    MockModel.findById.mockReturnValue(createChain(null));
    MockModel.findOneAndUpdate.mockReturnValue(createChain(null));
    MockModel.findOneAndDelete.mockReturnValue(createChain(null));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an account and return it', async () => {
      const createDto: CreateAccountDto = {
        color: '#FF5733',
        icon: 'wallet',
        name: 'Main Wallet',
        balance: 1000.5,
        scale: 2,
        currency: 'USD',
      };
      mockAccountModel.findById.mockReturnValue(createChain(mockAccount));

      const result = await service.create(userId, createDto);

      expect(mockAccountModel.findOne).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
        name: 'Main Wallet',
      });
      expect(saveMock).toHaveBeenCalled();
      expect(mockAccountModel.findById).toHaveBeenCalledWith(accountId);
      expect(result).toEqual(mockAccount);
    });

    it('should create an account with default balance when balance is not provided', async () => {
      const createDto: CreateAccountDto = {
        color: '#FF5733',
        icon: 'wallet',
        name: 'New Wallet',
        scale: 2,
        currency: 'USD',
      };
      const accountWithDefaultBalance = {
        ...mockAccount,
        balance: 0, // 0 in minor units
        name: 'New Wallet',
      };
      mockAccountModel.findById.mockReturnValue(
        createChain(accountWithDefaultBalance),
      );

      const result = await service.create(userId, createDto);

      expect(mockAccountModel.findOne).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
        name: 'New Wallet',
      });
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual(accountWithDefaultBalance);
    });

    it('should throw ConflictException when account name already exists', async () => {
      const createDto: CreateAccountDto = {
        color: '#FF5733',
        icon: 'wallet',
        name: 'Main Wallet',
        balance: 1000.5,
        scale: 2,
        currency: 'USD',
      };
      mockAccountModel.findOne.mockReturnValue(createChain(mockAccount));

      await expect(service.create(userId, createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(userId, createDto)).rejects.toThrow(
        'Account with this name already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of accounts for the user', async () => {
      const list = [mockAccount];
      mockAccountModel.find.mockReturnValue(createChain(list));

      const result = await service.findAll(userId);

      expect(mockAccountModel.find).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(list);
    });
  });

  describe('findOne', () => {
    it('should return an account by id for the user', async () => {
      mockAccountModel.findOne.mockReturnValue(createChain(mockAccount));

      const result = await service.findOne(userId, accountId.toString());

      expect(mockAccountModel.findOne).toHaveBeenCalledWith({
        _id: accountId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(mockAccount);
    });

    it('should return null when account not found', async () => {
      mockAccountModel.findOne.mockReturnValue(createChain(null));

      const result = await service.findOne(userId, 'invalid');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an account and return it', async () => {
      const updateDto: UpdateAccountDto = { name: 'Updated Name' };
      const updated = { ...mockAccount, name: 'Updated Name' };
      mockAccountModel.findOne.mockReturnValue(createChain(mockAccount));
      mockAccountModel.findOneAndUpdate.mockReturnValue(createChain(updated));

      const result = await service.update(
        userId,
        accountId.toString(),
        updateDto,
      );

      expect(mockAccountModel.findOne).toHaveBeenCalledWith({
        _id: accountId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(mockAccountModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: accountId.toString(),
          user: new Types.ObjectId(userId),
        },
        { name: 'Updated Name' },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should update balance and convert to minor units', async () => {
      const updateDto: UpdateAccountDto = { balance: 2000.75, scale: 2 };
      const updated = { ...mockAccount, balance: 200075, scale: 2 }; // 2000.75 * 10^2
      mockAccountModel.findOne.mockReturnValue(createChain(mockAccount));
      mockAccountModel.findOneAndUpdate.mockReturnValue(createChain(updated));

      const result = await service.update(
        userId,
        accountId.toString(),
        updateDto,
      );

      expect(mockAccountModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: accountId.toString(),
          user: new Types.ObjectId(userId),
        },
        { balance: 200075, scale: 2 },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should use existing scale when updating balance without new scale', async () => {
      const updateDto: UpdateAccountDto = { balance: 2000.75 };
      const updated = { ...mockAccount, balance: 200075 }; // Uses existing scale (2)
      mockAccountModel.findOne.mockReturnValue(createChain(mockAccount));
      mockAccountModel.findOneAndUpdate.mockReturnValue(createChain(updated));

      const result = await service.update(
        userId,
        accountId.toString(),
        updateDto,
      );

      expect(mockAccountModel.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: accountId.toString(),
          user: new Types.ObjectId(userId),
        },
        { balance: 200075 },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when account not found', async () => {
      mockAccountModel.findOne.mockReturnValue(createChain(null));

      await expect(
        service.update(userId, 'invalid', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when new name already exists', async () => {
      const updateDto: UpdateAccountDto = { name: 'Existing Name' };
      mockAccountModel.findOne
        .mockReturnValueOnce(createChain(mockAccount)) // First call for existing account check
        .mockReturnValueOnce(
          createChain({ _id: 'other-id', name: 'Existing Name' }),
        ); // Second call for name conflict check

      await expect(
        service.update(userId, accountId.toString(), updateDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove an account and return true', async () => {
      mockAccountModel.findOneAndDelete.mockReturnValue(
        createChain(mockAccount),
      );

      const result = await service.remove(userId, accountId.toString());

      expect(mockAccountModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: accountId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(result).toBe(true);
    });

    it('should throw NotFoundException when account not found', async () => {
      mockAccountModel.findOneAndDelete.mockReturnValue(createChain(null));

      await expect(service.remove(userId, 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toAccountDto', () => {
    it('should convert AccountDocument to AccountDto with balance converted from minor units', () => {
      const dto = service.toAccountDto(mockAccount);

      expect(dto).toEqual({
        id: mockAccount._id.toString(),
        color: mockAccount.color,
        icon: mockAccount.icon,
        name: mockAccount.name,
        balance: 1000.5, // Converted from 100050 minor units with scale 2
        scale: mockAccount.scale,
        currency: mockAccount.currency,
        createdAt: mockAccount.createdAt.toISOString(),
        updatedAt: mockAccount.updatedAt.toISOString(),
      });
    });
  });
});
