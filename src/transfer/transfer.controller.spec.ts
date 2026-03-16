import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import type { RequestUser } from '../auth/auth.dto';

import type { CreateTransferDto, UpdateTransferDto } from './transfer.dto';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

type MockedTransfer = {
  _id: string;
  user: string;
  from: {
    account: string;
    value: number;
    scale: number;
  };
  to: {
    account: string;
    value: number;
    scale: number;
  };
  rate: number;
  fee: { value: number; scale: number };
  createdAt: Date;
  updatedAt: Date;
};

describe('TransferController', () => {
  let controller: TransferController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    toTransferDto: jest.Mock;
  };

  const mockUser: RequestUser = {
    userId: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
  };

  const mockTransfer: MockedTransfer = {
    _id: '507f1f77bcf86cd799439099',
    user: mockUser.userId,
    from: {
      account: '507f1f77bcf86cd799439012',
      value: 10000,
      scale: 2,
    },
    to: {
      account: '507f1f77bcf86cd799439013',
      value: 9100,
      scale: 2,
    },
    rate: 0.91,
    fee: { value: 0, scale: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransferDto = {
    id: mockTransfer._id,
    from: mockTransfer.from,
    to: mockTransfer.to,
    rate: mockTransfer.rate,
    fee: mockTransfer.fee,
    createdAt: mockTransfer.createdAt.toISOString(),
    updatedAt: mockTransfer.updatedAt.toISOString(),
  };

  const mockCreateDto: CreateTransferDto = {
    from: {
      account: '507f1f77bcf86cd799439012',
      value: 10000,
      scale: 2,
    },
    to: {
      account: '507f1f77bcf86cd799439013',
      value: 9100,
      scale: 2,
    },
    rate: 0.91,
  };

  beforeEach(async () => {
    const mockTransferService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      toTransferDto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [{ provide: TransferService, useValue: mockTransferService }],
    }).compile();

    controller = module.get<TransferController>(TransferController);
    service = module.get(TransferService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a transfer and return TransferDto', async () => {
      service.create.mockResolvedValue(mockTransfer);
      service.toTransferDto.mockReturnValue(mockTransferDto);

      const result = await controller.create(mockUser, mockCreateDto);

      expect(service.create).toHaveBeenCalledWith(
        mockUser.userId,
        mockCreateDto,
      );
      expect(service.toTransferDto).toHaveBeenCalledWith(mockTransfer);
      expect(result).toEqual(mockTransferDto);
    });
  });

  describe('findAll', () => {
    it('should return list of transfers as TransferDto', async () => {
      service.findAll.mockResolvedValue([mockTransfer]);
      service.toTransferDto.mockReturnValue(mockTransferDto);

      const result = await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.userId, undefined);
      expect(service.toTransferDto).toHaveBeenCalledWith(mockTransfer);
      expect(result).toEqual([mockTransferDto]);
    });
  });

  describe('findOne', () => {
    it('should return TransferDto by id', async () => {
      service.findOne.mockResolvedValue(mockTransfer);
      service.toTransferDto.mockReturnValue(mockTransferDto);

      const result = await controller.findOne(mockUser, mockTransfer._id);

      expect(service.findOne).toHaveBeenCalledWith(
        mockUser.userId,
        mockTransfer._id,
      );
      expect(service.toTransferDto).toHaveBeenCalledWith(mockTransfer);
      expect(result).toEqual(mockTransferDto);
    });

    it('should throw NotFoundException when transfer not found', async () => {
      service.findOne.mockResolvedValue(null);

      await expect(controller.findOne(mockUser, 'invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update transfer and return TransferDto', async () => {
      const updateDto: UpdateTransferDto = {
        from: {
          account: '507f1f77bcf86cd799439012',
          value: 12000,
          scale: 2,
        },
        to: {
          account: '507f1f77bcf86cd799439013',
          value: 10920,
          scale: 2,
        },
        rate: 0.91,
      };
      const updated = {
        ...mockTransfer,
        from: { ...mockTransfer.from, value: 12000 },
        to: { ...mockTransfer.to, value: 10920 },
      };
      const updatedDto = {
        ...mockTransferDto,
        from: { ...mockTransferDto.from, value: 12000 },
        to: { ...mockTransferDto.to, value: 10920 },
      };

      service.update.mockResolvedValue(updated);
      service.toTransferDto.mockReturnValue(updatedDto);

      const result = await controller.update(
        mockUser,
        mockTransfer._id,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(
        mockUser.userId,
        mockTransfer._id,
        updateDto,
      );
      expect(service.toTransferDto).toHaveBeenCalledWith(updated);
      expect(result).toEqual(updatedDto);
    });
  });

  describe('remove', () => {
    it('should remove transfer and return void', async () => {
      service.remove.mockResolvedValue(true);

      await controller.remove(mockUser, mockTransfer._id);

      expect(service.remove).toHaveBeenCalledWith(
        mockUser.userId,
        mockTransfer._id,
      );
    });
  });
});
