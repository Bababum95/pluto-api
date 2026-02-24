import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types, type ClientSession } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { Account, type AccountDocument } from '../account/account.schema';

import {
  CreateTransferDto,
  TransferDto,
  type FeeDto,
  type TransferSideDto,
  UpdateTransferDto,
} from './transfer.dto';
import { Transfer, type TransferDocument } from './transfer.schema';

type TransferSideInput = {
  account: string;
  value: number;
  scale: number;
};

@Injectable()
export class TransferService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(Transfer.name)
    private readonly transferModel: Model<TransferDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    private readonly i18n: I18nService,
  ) {}

  private getUserObjectId(userId: string): Types.ObjectId {
    return new Types.ObjectId(userId);
  }

  private ensurePositiveValues(
    fromValue: number,
    toValue: number,
    rate: number,
  ): void {
    if (fromValue <= 0 || toValue <= 0) {
      throw new BadRequestException(
        this.i18n.t('transfer.errors.valueMustBePositive', {
          defaultValue: 'Transfer values must be greater than zero',
        }),
      );
    }

    if (rate <= 0) {
      throw new BadRequestException(
        this.i18n.t('transfer.errors.rateMustBePositive', {
          defaultValue: 'Rate must be greater than zero',
        }),
      );
    }
  }

  private async findUserAccount(
    userId: string,
    accountId: string,
    session?: ClientSession,
  ): Promise<AccountDocument | null> {
    const query = this.accountModel.findOne({
      _id: accountId,
      user: this.getUserObjectId(userId),
    });

    if (session) {
      query.session(session);
    }

    return query.exec();
  }

  private async validateTransferAccounts(
    userId: string,
    from: TransferSideInput,
    to: TransferSideInput,
    session?: ClientSession,
  ): Promise<void> {
    if (from.account === to.account) {
      throw new BadRequestException(
        this.i18n.t('transfer.errors.sameAccount', {
          defaultValue: 'From and to accounts must be different',
        }),
      );
    }

    const [fromAccount, toAccount] = await Promise.all([
      this.findUserAccount(userId, from.account, session),
      this.findUserAccount(userId, to.account, session),
    ]);

    if (!fromAccount || !toAccount) {
      throw new BadRequestException(
        this.i18n.t('transfer.errors.accountNotFound', {
          defaultValue: 'Account not found',
        }),
      );
    }

    if (fromAccount.scale !== from.scale) {
      throw new BadRequestException(
        this.i18n.t('transfer.errors.fromScaleMismatch', {
          defaultValue: 'From scale must match source account scale',
        }),
      );
    }

    if (toAccount.scale !== to.scale) {
      throw new BadRequestException(
        this.i18n.t('transfer.errors.toScaleMismatch', {
          defaultValue: 'To scale must match destination account scale',
        }),
      );
    }
  }

  private toTransferSideInput(
    source: { account: Types.ObjectId; value: number; scale: number },
    patch?: TransferSideDto,
  ): TransferSideInput {
    return {
      account: patch?.account ?? source.account.toString(),
      value: patch?.value ?? source.value,
      scale: patch?.scale ?? source.scale,
    };
  }

  private toTransferPersistenceData(transfer: TransferSideInput): {
    account: Types.ObjectId;
    value: number;
    scale: number;
  } {
    return {
      account: new Types.ObjectId(transfer.account),
      value: transfer.value,
      scale: transfer.scale,
    };
  }

  private toFeePersistenceData(fee: FeeDto | undefined): {
    value: number;
    scale: number;
  } {
    return {
      value: fee?.value ?? 0,
      scale: fee?.scale ?? 0,
    };
  }

  async create(
    userId: string,
    createTransferDto: CreateTransferDto,
  ): Promise<TransferDocument> {
    this.ensurePositiveValues(
      createTransferDto.from.value,
      createTransferDto.to.value,
      createTransferDto.rate,
    );

    await this.validateTransferAccounts(
      userId,
      createTransferDto.from,
      createTransferDto.to,
    );

    const session = await this.connection.startSession();

    try {
      const created = await session.withTransaction(async () => {
        const transfer = new this.transferModel({
          user: this.getUserObjectId(userId),
          from: this.toTransferPersistenceData(createTransferDto.from),
          to: this.toTransferPersistenceData(createTransferDto.to),
          rate: createTransferDto.rate,
          fee: this.toFeePersistenceData(createTransferDto.fee),
        });

        await transfer.save({ session });

        await this.accountModel
          .updateOne(
            {
              _id: createTransferDto.from.account,
              user: this.getUserObjectId(userId),
            },
            { $inc: { balance: -createTransferDto.from.value } },
            { session },
          )
          .exec();

        await this.accountModel
          .updateOne(
            {
              _id: createTransferDto.to.account,
              user: this.getUserObjectId(userId),
            },
            { $inc: { balance: createTransferDto.to.value } },
            { session },
          )
          .exec();

        const result = await this.transferModel
          .findById(transfer._id)
          .session(session)
          .exec();

        if (!result) {
          throw new Error(
            this.i18n.t('transfer.create.failed', {
              defaultValue: 'Transfer creation failed',
            }),
          );
        }

        return result;
      });

      return created as TransferDocument;
    } finally {
      await session.endSession();
    }
  }

  async findAll(userId: string): Promise<TransferDocument[]> {
    return this.transferModel
      .find({ user: this.getUserObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<TransferDocument | null> {
    return this.transferModel
      .findOne({
        _id: id,
        user: this.getUserObjectId(userId),
      })
      .exec();
  }

  async update(
    userId: string,
    id: string,
    updateTransferDto: UpdateTransferDto,
  ): Promise<TransferDocument> {
    const session = await this.connection.startSession();

    try {
      const updated = await session.withTransaction(async () => {
        const current = await this.transferModel
          .findOne({
            _id: id,
            user: this.getUserObjectId(userId),
          })
          .session(session)
          .exec();

        if (!current) {
          throw new NotFoundException(
            this.i18n.t('transfer.errors.notFound', {
              defaultValue: 'Transfer not found',
            }),
          );
        }

        const nextFrom = this.toTransferSideInput(
          current.from,
          updateTransferDto.from,
        );
        const nextTo = this.toTransferSideInput(
          current.to,
          updateTransferDto.to,
        );
        const nextRate = updateTransferDto.rate ?? current.rate;
        const nextFee =
          updateTransferDto.fee !== undefined
            ? this.toFeePersistenceData(updateTransferDto.fee)
            : {
                value: current.fee?.value ?? 0,
                scale: current.fee?.scale ?? 0,
              };

        this.ensurePositiveValues(nextFrom.value, nextTo.value, nextRate);
        await this.validateTransferAccounts(userId, nextFrom, nextTo, session);

        // Roll back the effect of the previous transfer
        await this.accountModel
          .updateOne(
            {
              _id: current.from.account,
              user: this.getUserObjectId(userId),
            },
            { $inc: { balance: current.from.value } },
            { session },
          )
          .exec();

        await this.accountModel
          .updateOne(
            {
              _id: current.to.account,
              user: this.getUserObjectId(userId),
            },
            { $inc: { balance: -current.to.value } },
            { session },
          )
          .exec();

        // Apply the new transfer values
        await this.accountModel
          .updateOne(
            {
              _id: nextFrom.account,
              user: this.getUserObjectId(userId),
            },
            { $inc: { balance: -nextFrom.value } },
            { session },
          )
          .exec();

        await this.accountModel
          .updateOne(
            {
              _id: nextTo.account,
              user: this.getUserObjectId(userId),
            },
            { $inc: { balance: nextTo.value } },
            { session },
          )
          .exec();

        const result = await this.transferModel
          .findOneAndUpdate(
            {
              _id: id,
              user: this.getUserObjectId(userId),
            },
            {
              from: this.toTransferPersistenceData(nextFrom),
              to: this.toTransferPersistenceData(nextTo),
              rate: nextRate,
              fee: nextFee,
            },
            { new: true, session },
          )
          .exec();

        if (!result) {
          throw new NotFoundException(
            this.i18n.t('transfer.errors.notFound', {
              defaultValue: 'Transfer not found',
            }),
          );
        }

        return result;
      });

      return updated as TransferDocument;
    } finally {
      await session.endSession();
    }
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        const deleted = await this.transferModel
          .findOneAndDelete({
            _id: id,
            user: this.getUserObjectId(userId),
          })
          .session(session)
          .exec();

        if (!deleted) {
          throw new NotFoundException(
            this.i18n.t('transfer.errors.notFound', {
              defaultValue: 'Transfer not found',
            }),
          );
        }

        await this.accountModel
          .updateOne(
            {
              _id: deleted.from.account,
              user: this.getUserObjectId(userId),
            },
            { $inc: { balance: deleted.from.value } },
            { session },
          )
          .exec();

        await this.accountModel
          .updateOne(
            {
              _id: deleted.to.account,
              user: this.getUserObjectId(userId),
            },
            { $inc: { balance: -deleted.to.value } },
            { session },
          )
          .exec();
      });

      return true;
    } finally {
      await session.endSession();
    }
  }

  toTransferDto(transfer: TransferDocument): TransferDto {
    return {
      id: transfer._id.toString(),
      from: {
        account: transfer.from.account.toString(),
        value: transfer.from.value,
        scale: transfer.from.scale,
      },
      to: {
        account: transfer.to.account.toString(),
        value: transfer.to.value,
        scale: transfer.to.scale,
      },
      rate: transfer.rate,
      fee: {
        value: transfer.fee?.value ?? 0,
        scale: transfer.fee?.scale ?? 0,
      },
      createdAt: transfer.createdAt.toISOString(),
      updatedAt: transfer.updatedAt.toISOString(),
    };
  }
}
