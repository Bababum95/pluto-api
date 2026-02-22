import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { Account } from '../account/account.schema';

import type {
  CreateTransferDto,
  UpdateTransferDto,
  TransferSideDto,
} from './transfer.dto';
import { TransferService } from './transfer.service';
import { Transfer, type TransferDocument } from './transfer.schema';

const mockI18nService = {
  t: (key: string, options?: { defaultValue?: string }): string => {
    const messages: Record<string, string> = {
      'transfer.errors.valueMustBePositive':
        'Transfer values must be greater than zero',
      'transfer.errors.rateMustBePositive': 'Rate must be greater than zero',
      'transfer.errors.sameAccount': 'From and to accounts must be different',
      'transfer.errors.accountNotFound': 'Account not found',
      'transfer.errors.fromScaleMismatch':
        'From scale must match source account scale',
      'transfer.errors.toScaleMismatch':
        'To scale must match destination account scale',
      'transfer.create.failed': 'Transfer creation failed',
      'transfer.errors.notFound': 'Transfer not found',
    };
    return options?.defaultValue ?? messages[key] ?? key;
  },
};

const createChain = (resolvedValue: unknown) => ({
  exec: jest.fn().mockResolvedValue(resolvedValue),
  sort: jest.fn().mockReturnThis(),
  session: jest.fn().mockReturnThis(),
});

describe('TransferService', () => {
  let service: TransferService;
  let mockTransferModel: {
    findOne: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findOneAndUpdate: jest.Mock;
    findOneAndDelete: jest.Mock;
  };
  let mockAccountModel: {
    findOne: jest.Mock;
    updateOne: jest.Mock;
  };
  let mockSession: {
    withTransaction: jest.Mock;
    endSession: jest.Mock;
  };
  let saveMock: jest.Mock;

  const userId = '507f1f77bcf86cd799439011';
  const transferId = new Types.ObjectId('507f1f77bcf86cd799439099');
  const fromAccountId = new Types.ObjectId('507f1f77bcf86cd799439012');
  const toAccountId = new Types.ObjectId('507f1f77bcf86cd799439013');

  const mockTransfer = {
    _id: transferId,
    user: new Types.ObjectId(userId),
    from: {
      account: fromAccountId,
      value: 10000,
      scale: 2,
    },
    to: {
      account: toAccountId,
      value: 9100,
      scale: 2,
    },
    rate: 0.91,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as TransferDocument;

  const mockFromAccount = {
    _id: fromAccountId,
    user: new Types.ObjectId(userId),
    scale: 2,
  };

  const mockToAccount = {
    _id: toAccountId,
    user: new Types.ObjectId(userId),
    scale: 2,
  };

  beforeEach(async () => {
    saveMock = jest.fn().mockResolvedValue(undefined);

    function MockTransferModel(
      this: { _id: Types.ObjectId; save: jest.Mock },
      dto?: Record<string, unknown>,
    ) {
      this._id = transferId;
      this.save = saveMock;
      Object.assign(this, dto);
    }

    const transferStatics = {
      findOne: jest.fn().mockReturnValue(createChain(null)),
      find: jest.fn().mockReturnValue(createChain([])),
      findById: jest.fn().mockReturnValue(createChain(mockTransfer)),
      findOneAndUpdate: jest.fn().mockReturnValue(createChain(null)),
      findOneAndDelete: jest.fn().mockReturnValue(createChain(null)),
    };

    const MockTransferModelWithStatics = Object.assign(
      MockTransferModel,
      transferStatics,
    );
    mockTransferModel = transferStatics;

    mockAccountModel = {
      findOne: jest.fn().mockImplementation((query: { _id: string }) => {
        if (query._id === fromAccountId.toString()) {
          return createChain(mockFromAccount);
        }
        if (query._id === toAccountId.toString()) {
          return createChain(mockToAccount);
        }
        return createChain(null);
      }),
      updateOne: jest.fn().mockReturnValue(createChain({ modifiedCount: 1 })),
    };

    mockSession = {
      withTransaction: jest.fn((cb: () => Promise<unknown>) => cb()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };

    const mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: getModelToken(Transfer.name),
          useValue: MockTransferModelWithStatics,
        },
        {
          provide: getModelToken(Account.name),
          useValue: mockAccountModel,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<TransferService>(TransferService);
    jest.clearAllMocks();

    mockTransferModel.findOne.mockReturnValue(createChain(null));
    mockTransferModel.find.mockReturnValue(createChain([]));
    mockTransferModel.findById.mockReturnValue(createChain(mockTransfer));
    mockTransferModel.findOneAndUpdate.mockReturnValue(createChain(null));
    mockTransferModel.findOneAndDelete.mockReturnValue(createChain(null));
    mockAccountModel.updateOne.mockReturnValue(
      createChain({ modifiedCount: 1 }),
    );
    mockAccountModel.findOne.mockImplementation((query: { _id: string }) => {
      if (query._id === fromAccountId.toString()) {
        return createChain(mockFromAccount);
      }
      if (query._id === toAccountId.toString()) {
        return createChain(mockToAccount);
      }
      return createChain(null);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a transfer and update both accounts', async () => {
      const createDto: CreateTransferDto = {
        from: {
          account: fromAccountId.toString(),
          value: 10000,
          scale: 2,
        },
        to: {
          account: toAccountId.toString(),
          value: 9100,
          scale: 2,
        },
        rate: 0.91,
      };

      const result = await service.create(userId, createDto);

      expect(mockAccountModel.findOne).toHaveBeenCalledWith({
        _id: fromAccountId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(mockAccountModel.findOne).toHaveBeenCalledWith({
        _id: toAccountId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(saveMock).toHaveBeenCalled();
      expect(mockAccountModel.updateOne).toHaveBeenCalledWith(
        { _id: fromAccountId.toString(), user: new Types.ObjectId(userId) },
        { $inc: { balance: -10000 } },
        { session: mockSession },
      );
      expect(mockAccountModel.updateOne).toHaveBeenCalledWith(
        { _id: toAccountId.toString(), user: new Types.ObjectId(userId) },
        { $inc: { balance: 9100 } },
        { session: mockSession },
      );
      expect(result).toEqual(mockTransfer);
    });

    it('should throw BadRequestException when from and to accounts are equal', async () => {
      const sameAccount = fromAccountId.toString();
      const createDto: CreateTransferDto = {
        from: {
          account: sameAccount,
          value: 10000,
          scale: 2,
        },
        to: {
          account: sameAccount,
          value: 9100,
          scale: 2,
        },
        rate: 0.91,
      };

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(userId, createDto)).rejects.toThrow(
        'From and to accounts must be different',
      );
    });
  });

  describe('findAll', () => {
    it('should return transfers list for user', async () => {
      const list = [mockTransfer];
      mockTransferModel.find.mockReturnValue(createChain(list));

      const result = await service.findAll(userId);

      expect(mockTransferModel.find).toHaveBeenCalledWith({
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(list);
    });
  });

  describe('findOne', () => {
    it('should return transfer by id', async () => {
      mockTransferModel.findOne.mockReturnValue(createChain(mockTransfer));

      const result = await service.findOne(userId, transferId.toString());

      expect(mockTransferModel.findOne).toHaveBeenCalledWith({
        _id: transferId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(result).toEqual(mockTransfer);
    });
  });

  describe('update', () => {
    it('should update transfer, rollback old balances and apply new balances', async () => {
      const updateDto: UpdateTransferDto = {
        from: {
          account: fromAccountId.toString(),
          value: 12000,
          scale: 2,
        },
        to: {
          account: toAccountId.toString(),
          value: 10920,
          scale: 2,
        },
        rate: 0.91,
      };

      const updatedTransfer = {
        ...mockTransfer,
        from: {
          ...mockTransfer.from,
          value: 12000,
        },
        to: {
          ...mockTransfer.to,
          value: 10920,
        },
      } as unknown as TransferDocument;

      mockTransferModel.findOne.mockReturnValueOnce(createChain(mockTransfer));
      mockTransferModel.findOneAndUpdate.mockReturnValue(
        createChain(updatedTransfer),
      );

      const result = await service.update(
        userId,
        transferId.toString(),
        updateDto,
      );

      expect(mockTransferModel.findOne).toHaveBeenCalledWith({
        _id: transferId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(mockAccountModel.updateOne).toHaveBeenCalledWith(
        { _id: fromAccountId, user: new Types.ObjectId(userId) },
        { $inc: { balance: 10000 } },
        { session: mockSession },
      );
      expect(mockAccountModel.updateOne).toHaveBeenCalledWith(
        { _id: toAccountId, user: new Types.ObjectId(userId) },
        { $inc: { balance: -9100 } },
        { session: mockSession },
      );
      expect(mockAccountModel.updateOne).toHaveBeenCalledWith(
        { _id: fromAccountId.toString(), user: new Types.ObjectId(userId) },
        { $inc: { balance: -12000 } },
        { session: mockSession },
      );
      expect(mockAccountModel.updateOne).toHaveBeenCalledWith(
        { _id: toAccountId.toString(), user: new Types.ObjectId(userId) },
        { $inc: { balance: 10920 } },
        { session: mockSession },
      );
      expect(result).toEqual(updatedTransfer);
    });

    it('should throw NotFoundException when transfer not found', async () => {
      const updateDto: UpdateTransferDto = {
        rate: 1,
      };

      mockTransferModel.findOne.mockReturnValue(createChain(null));

      await expect(
        service.update(userId, 'invalid', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete transfer and rollback balances', async () => {
      mockTransferModel.findOneAndDelete.mockReturnValue(
        createChain(mockTransfer),
      );

      const result = await service.remove(userId, transferId.toString());

      expect(mockTransferModel.findOneAndDelete).toHaveBeenCalledWith({
        _id: transferId.toString(),
        user: new Types.ObjectId(userId),
      });
      expect(mockAccountModel.updateOne).toHaveBeenCalledWith(
        { _id: fromAccountId, user: new Types.ObjectId(userId) },
        { $inc: { balance: 10000 } },
        { session: mockSession },
      );
      expect(mockAccountModel.updateOne).toHaveBeenCalledWith(
        { _id: toAccountId, user: new Types.ObjectId(userId) },
        { $inc: { balance: -9100 } },
        { session: mockSession },
      );
      expect(result).toBe(true);
    });

    it('should throw NotFoundException when transfer not found', async () => {
      mockTransferModel.findOneAndDelete.mockReturnValue(createChain(null));

      await expect(service.remove(userId, 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toTransferDto', () => {
    it('should map TransferDocument to TransferDto', () => {
      const dto = service.toTransferDto(mockTransfer);

      expect(dto).toEqual({
        id: transferId.toString(),
        from: {
          account: fromAccountId.toString(),
          value: 10000,
          scale: 2,
        },
        to: {
          account: toAccountId.toString(),
          value: 9100,
          scale: 2,
        },
        rate: 0.91,
        createdAt: mockTransfer.createdAt.toISOString(),
        updatedAt: mockTransfer.updatedAt.toISOString(),
      });
    });
  });

  describe('business validation', () => {
    it('should throw when update payload leads to same accounts', async () => {
      const current = {
        ...mockTransfer,
      } as unknown as TransferDocument;
      mockTransferModel.findOne.mockReturnValue(createChain(current));

      const sameAccount = fromAccountId.toString();
      const updateDto: UpdateTransferDto = {
        to: {
          account: sameAccount,
          value: 9100,
          scale: 2,
        } as TransferSideDto,
      };

      await expect(
        service.update(userId, transferId.toString(), updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
