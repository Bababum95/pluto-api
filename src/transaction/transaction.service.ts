import Decimal from 'decimal.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { Transaction, TransactionDocument } from './transaction.schema';
import { Category, CategoryDocument } from '../category/category.schema';
import { Account, AccountDocument } from '../account/account.schema';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionDto,
} from './transaction.dto';
import { TransactionType } from './transaction.enum';

@Injectable()
export class TransactionService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Account.name)
    private readonly accountModel: Model<AccountDocument>,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Convert minor units to decimal amount (e.g. 150050 with scale 2 -> 1500.50).
   */
  private fromMinorUnits(amountRaw: number, scale: number): number {
    return new Decimal(amountRaw).div(new Decimal(10).pow(scale)).toNumber();
  }

  private async validateCategoryBelongsToUser(
    userId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.categoryModel
      .findOne({
        _id: categoryId,
        user: new Types.ObjectId(userId),
      })
      .exec();
    if (!category) {
      throw new BadRequestException(
        this.i18n.t('transaction.errors.categoryNotFound', {
          defaultValue: 'Category not found',
        }),
      );
    }
  }

  private async validateAccountBelongsToUser(
    userId: string,
    accountId: string,
  ): Promise<void> {
    const account = await this.accountModel
      .findOne({
        _id: accountId,
        user: new Types.ObjectId(userId),
      })
      .exec();
    if (!account) {
      throw new BadRequestException(
        this.i18n.t('transaction.errors.accountNotFound', {
          defaultValue: 'Account not found',
        }),
      );
    }
  }

  async create(
    userId: string,
    createTransactionDto: CreateTransactionDto,
  ): Promise<TransactionDocument> {
    await this.validateCategoryBelongsToUser(
      userId,
      createTransactionDto.category,
    );
    await this.validateAccountBelongsToUser(
      userId,
      createTransactionDto.account,
    );

    const session = await this.connection.startSession();
    try {
      const created = await session.withTransaction(async () => {
        const transaction = new this.transactionModel({
          user: new Types.ObjectId(userId),
          type: createTransactionDto.type,
          category: new Types.ObjectId(createTransactionDto.category),
          comment: createTransactionDto.comment?.trim() ?? '',
          account: new Types.ObjectId(createTransactionDto.account),
          amount: createTransactionDto.amount,
          scale: createTransactionDto.scale,
          tags: (createTransactionDto.tags ?? [])
            .map((t) => t.trim())
            .filter(Boolean),
        });

        await transaction.save({ session });

        // Determine signed amount based on transaction type
        const signedAmount =
          createTransactionDto.type === TransactionType.EXPENSE
            ? -createTransactionDto.amount
            : createTransactionDto.amount;

        await this.accountModel
          .updateOne(
            {
              _id: createTransactionDto.account,
              user: new Types.ObjectId(userId),
            },
            { $inc: { balance: signedAmount } },
            { session },
          )
          .exec();

        const result = await this.transactionModel
          .findById(transaction._id)
          .session(session)
          .exec();

        if (!result) {
          throw new Error(
            this.i18n.t('transaction.create.failed', {
              defaultValue: 'Transaction creation failed',
            }),
          );
        }

        return result;
      });
      return created as TransactionDocument;
    } finally {
      await session.endSession();
    }
  }

  async findAll(userId: string): Promise<TransactionDocument[]> {
    return this.transactionModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<TransactionDocument | null> {
    return this.transactionModel
      .findOne({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .exec();
  }

  async update(
    userId: string,
    id: string,
    updateTransactionDto: UpdateTransactionDto,
  ): Promise<TransactionDocument> {
    if (updateTransactionDto.category) {
      await this.validateCategoryBelongsToUser(
        userId,
        updateTransactionDto.category,
      );
    }
    if (updateTransactionDto.account) {
      await this.validateAccountBelongsToUser(
        userId,
        updateTransactionDto.account,
      );
    }

    const updateData: Record<string, unknown> = {};

    if (updateTransactionDto.type !== undefined) {
      updateData.type = updateTransactionDto.type;
    }
    if (updateTransactionDto.category !== undefined) {
      updateData.category = new Types.ObjectId(updateTransactionDto.category);
    }
    if (updateTransactionDto.comment !== undefined) {
      updateData.comment = updateTransactionDto.comment.trim();
    }
    if (updateTransactionDto.account !== undefined) {
      updateData.account = new Types.ObjectId(updateTransactionDto.account);
    }
    if (updateTransactionDto.scale !== undefined) {
      updateData.scale = updateTransactionDto.scale;
    }
    if (updateTransactionDto.tags !== undefined) {
      updateData.tags = updateTransactionDto.tags
        .map((t) => t.trim())
        .filter(Boolean);
    }
    if (
      updateTransactionDto.amount !== undefined &&
      updateTransactionDto.scale !== undefined
    ) {
      updateData.amount = updateTransactionDto.amount;
    } else if (updateTransactionDto.amount !== undefined) {
      const existing = await this.transactionModel
        .findOne({ _id: id, user: new Types.ObjectId(userId) })
        .exec();
      if (!existing) {
        throw new NotFoundException(
          this.i18n.t('transaction.errors.notFound', {
            defaultValue: 'Transaction not found',
          }),
        );
      }
      updateData.amount = updateTransactionDto.amount;
    }

    const transaction = await this.transactionModel
      .findOneAndUpdate(
        { _id: id, user: new Types.ObjectId(userId) },
        updateData,
        { new: true },
      )
      .exec();

    if (!transaction) {
      throw new NotFoundException(
        this.i18n.t('transaction.errors.notFound', {
          defaultValue: 'Transaction not found',
        }),
      );
    }

    return transaction;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const result = await this.transactionModel
      .findOneAndDelete({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .exec();

    if (!result) {
      throw new NotFoundException(
        this.i18n.t('transaction.errors.notFound', {
          defaultValue: 'Transaction not found',
        }),
      );
    }

    return true;
  }

  toTransactionDto(transaction: TransactionDocument): TransactionDto {
    return {
      id: transaction._id.toString(),
      type: transaction.type,
      category: transaction.category.toString(),
      comment: transaction.comment ?? '',
      account: transaction.account.toString(),
      amount: this.fromMinorUnits(transaction.amount, transaction.scale),
      amount_raw: transaction.amount,
      scale: transaction.scale,
      tags: transaction.tags ?? [],
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  }
}
