import Decimal from 'decimal.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { Category, CategoryDocument } from '../category/category.schema';
import { Account, AccountDocument } from '../account/account.schema';
import { Tag, TagDocument } from '../tag/tag.schema';
import { TransactionType } from './transaction.enum';
import { CategoryService } from '../category/category.service';
import { AccountService } from '../account/account.service';
import { TagService } from '../tag/tag.service';
import { MoneyService } from '../money/money.service';
import { MoneyViewDto } from '../money/money.dto';
import type { Rate } from '../rate/rate.schema';
import type { CurrencyDocument } from '../currency/currency.schema';

import { Transaction, TransactionDocument } from './transaction.schema';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionDto,
  TransactionFilterDto,
} from './transaction.dto';

/** Options for toTransactionDto: settings (with optional currency) and rates for conversion. */
export type ToTransactionDtoOptions = {
  settings: { currency?: CurrencyDocument } | null;
  rates: Rate[];
};

/** Transaction document with category, account and tags populated for DTO mapping. */
export type TransactionDocumentPopulated = Omit<
  TransactionDocument,
  'category' | 'account' | 'tags'
> & {
  category: CategoryDocument;
  account: AccountDocument;
  tags: TagDocument[];
};

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
    @InjectModel(Tag.name)
    private readonly tagModel: Model<TagDocument>,
    private readonly categoryService: CategoryService,
    private readonly accountService: AccountService,
    private readonly tagService: TagService,
    private readonly i18n: I18nService,
    private readonly moneyService: MoneyService,
  ) {}

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

  private async validateTagsBelongToUser(
    userId: string,
    tagIds: string[],
  ): Promise<void> {
    if (!tagIds?.length) return;
    const tags = await this.tagModel
      .find({
        _id: { $in: tagIds.map((id) => new Types.ObjectId(id)) },
        user: new Types.ObjectId(userId),
      })
      .exec();
    if (tags.length !== tagIds.length) {
      throw new BadRequestException(
        this.i18n.t('transaction.errors.tagNotFound', {
          defaultValue: 'One or more tags not found',
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
    await this.validateTagsBelongToUser(
      userId,
      createTransactionDto.tags ?? [],
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
          tags: (createTransactionDto.tags ?? []).map(
            (id) => new Types.ObjectId(id),
          ),
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
      const populated = await this.transactionModel
        .findById((created as TransactionDocument)._id)
        .populate('category')
        .populate('tags')
        .populate({ path: 'account', populate: { path: 'currency' } })
        .exec();
      return (populated ?? created) as TransactionDocument;
    } finally {
      await session.endSession();
    }
  }

  async findAll(
    userId: string,
    filters?: TransactionFilterDto,
  ): Promise<TransactionDocument[]> {
    const query: Record<string, unknown> = {
      user: new Types.ObjectId(userId),
    };

    if (filters?.from) {
      query.createdAt = {
        ...(query.createdAt as object),
        $gte: new Date(filters.from),
      };
    }
    if (filters?.to) {
      const end = new Date(filters.to);
      if (filters.to.length <= 10) {
        end.setUTCHours(23, 59, 59, 999);
      }
      query.createdAt = {
        ...(query.createdAt as object),
        $lte: end,
      };
    }
    if (filters?.type) {
      query.type = filters.type;
    }
    if (filters?.category) {
      query.category = new Types.ObjectId(filters.category);
    }
    if (filters?.account) {
      query.account = new Types.ObjectId(filters.account);
    }

    return this.transactionModel
      .find(query)
      .sort({ createdAt: -1 })
      .populate('category')
      .populate('tags')
      .populate({ path: 'account', populate: { path: 'currency' } })
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
      .populate('category')
      .populate('tags')
      .populate({ path: 'account', populate: { path: 'currency' } })
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
    if (updateTransactionDto.tags !== undefined) {
      await this.validateTagsBelongToUser(userId, updateTransactionDto.tags);
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
      updateData.tags = updateTransactionDto.tags.map(
        (id) => new Types.ObjectId(id),
      );
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

    const updated = await this.transactionModel
      .findOneAndUpdate(
        { _id: id, user: new Types.ObjectId(userId) },
        updateData,
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(
        this.i18n.t('transaction.errors.notFound', {
          defaultValue: 'Transaction not found',
        }),
      );
    }

    const populated = await this.transactionModel
      .findById(updated._id)
      .populate('category')
      .populate('tags')
      .populate({ path: 'account', populate: { path: 'currency' } })
      .exec();

    return (populated ?? updated) as TransactionDocument;
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

  toTransactionDto(
    transaction: TransactionDocumentPopulated | TransactionDocument,
    options: ToTransactionDtoOptions,
  ): TransactionDto {
    const category =
      transaction.category && typeof transaction.category === 'object'
        ? this.categoryService.toCategoryDto(
            transaction.category as CategoryDocument,
          )
        : null;
    const account =
      transaction.account && typeof transaction.account === 'object'
        ? this.accountService.toAccountDto(
            transaction.account as AccountDocument,
          )
        : null;

    if (!category || !account) {
      throw new Error(
        'Transaction must have category and account populated before mapping to DTO',
      );
    }

    const value = this.moneyService.fromMinorUnits(
      transaction.amount,
      transaction.scale,
    );
    const moneyOriginal: MoneyViewDto = {
      value,
      raw: transaction.amount,
      scale: transaction.scale,
      currency: {
        id: account.balance.original.currency.id,
        code: account.balance.original.currency.code,
        symbol: account.balance.original.currency.symbol,
        decimal_digits: account.balance.original.currency.decimal_digits,
      },
    };

    const converted = this.moneyService.convertAmount(
      new Decimal(value),
      account.balance.original.currency.code,
      options.rates,
      options.settings?.currency,
    );

    const tags = Array.isArray(transaction.tags)
      ? (transaction.tags as TagDocument[])
          .filter(
            (t): t is TagDocument => t && typeof t === 'object' && '_id' in t,
          )
          .map((t) => this.tagService.toTagDto(t))
      : [];

    return {
      id: transaction._id.toString(),
      type: transaction.type,
      category,
      comment: transaction.comment ?? '',
      tags,
      amount: {
        original: moneyOriginal,
        converted: converted ?? moneyOriginal,
      },
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  }
}
