import Decimal from 'decimal.js';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { Category, CategoryDocument } from '../category/category.schema';
import { Account, AccountDocument } from '../account/account.schema';
import { Tag, TagDocument } from '../tag/tag.schema';
import { CategoryService } from '../category/category.service';
import { AccountService } from '../account/account.service';
import { TagService } from '../tag/tag.service';
import { MoneyService } from '../money/money.service';
import { MoneyViewDto } from '../money/money.dto';
import type { Rate } from '../rate/rate.schema';
import type { CurrencyDocument } from '../currency/currency.schema';

import {
  RegularPayment,
  RegularPaymentDocument,
} from './regular-payment.schema';
import {
  CreateRegularPaymentDto,
  UpdateRegularPaymentDto,
  RegularPaymentDto,
} from './regular-payment.dto';

/** Options for toRegularPaymentDto: settings (with optional currency) and rates. */
export type ToRegularPaymentDtoOptions = {
  settings: { currency?: CurrencyDocument } | null;
  rates: Rate[];
};

/** Regular payment document with category, account and tags populated. */
export type RegularPaymentDocumentPopulated = Omit<
  RegularPaymentDocument,
  'category' | 'account' | 'tags'
> & {
  category: CategoryDocument;
  account: AccountDocument;
  tags: TagDocument[];
};

@Injectable()
export class RegularPaymentService {
  constructor(
    @InjectModel(RegularPayment.name)
    private readonly regularPaymentModel: Model<RegularPaymentDocument>,
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
        this.i18n.t('regularPayment.errors.categoryNotFound', {
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
        this.i18n.t('regularPayment.errors.accountNotFound', {
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
        this.i18n.t('regularPayment.errors.tagNotFound', {
          defaultValue: 'One or more tags not found',
        }),
      );
    }
  }

  async create(
    userId: string,
    dto: CreateRegularPaymentDto,
  ): Promise<RegularPaymentDocument> {
    await this.validateCategoryBelongsToUser(userId, dto.category);
    await this.validateAccountBelongsToUser(userId, dto.account);
    await this.validateTagsBelongToUser(userId, dto.tags ?? []);

    const doc = new this.regularPaymentModel({
      user: new Types.ObjectId(userId),
      type: dto.type,
      category: new Types.ObjectId(dto.category),
      comment: dto.comment?.trim() ?? '',
      account: new Types.ObjectId(dto.account),
      amount: dto.amount,
      scale: dto.scale,
      tags: (dto.tags ?? []).map((id) => new Types.ObjectId(id)),
    });
    await doc.save();

    const populated = await this.regularPaymentModel
      .findById(doc._id)
      .populate('category')
      .populate('tags')
      .populate({ path: 'account', populate: { path: 'currency' } })
      .exec();

    if (!populated) {
      throw new Error(
        this.i18n.t('regularPayment.create.failed', {
          defaultValue: 'Regular payment creation failed',
        }),
      );
    }
    return populated;
  }

  async findAll(userId: string): Promise<RegularPaymentDocument[]> {
    return this.regularPaymentModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .populate('category')
      .populate('tags')
      .populate({ path: 'account', populate: { path: 'currency' } })
      .exec();
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<RegularPaymentDocument | null> {
    return this.regularPaymentModel
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
    dto: UpdateRegularPaymentDto,
  ): Promise<RegularPaymentDocument> {
    if (dto.category) {
      await this.validateCategoryBelongsToUser(userId, dto.category);
    }
    if (dto.account) {
      await this.validateAccountBelongsToUser(userId, dto.account);
    }
    if (dto.tags !== undefined) {
      await this.validateTagsBelongToUser(userId, dto.tags);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.category !== undefined) {
      updateData.category = new Types.ObjectId(dto.category);
    }
    if (dto.comment !== undefined) updateData.comment = dto.comment.trim();
    if (dto.account !== undefined) {
      updateData.account = new Types.ObjectId(dto.account);
    }
    if (dto.amount !== undefined) updateData.amount = dto.amount;
    if (dto.scale !== undefined) updateData.scale = dto.scale;
    if (dto.tags !== undefined) {
      updateData.tags = dto.tags.map((id) => new Types.ObjectId(id));
    }

    const updated = await this.regularPaymentModel
      .findOneAndUpdate(
        { _id: id, user: new Types.ObjectId(userId) },
        updateData,
        { new: true },
      )
      .populate('category')
      .populate('tags')
      .populate({ path: 'account', populate: { path: 'currency' } })
      .exec();

    if (!updated) {
      throw new NotFoundException(
        this.i18n.t('regularPayment.errors.notFound', {
          defaultValue: 'Regular payment not found',
        }),
      );
    }
    return updated;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const result = await this.regularPaymentModel
      .findOneAndDelete({
        _id: id,
        user: new Types.ObjectId(userId),
      })
      .exec();

    if (!result) {
      throw new NotFoundException(
        this.i18n.t('regularPayment.errors.notFound', {
          defaultValue: 'Regular payment not found',
        }),
      );
    }
    return true;
  }

  toRegularPaymentDto(
    payment: RegularPaymentDocumentPopulated | RegularPaymentDocument,
    options: ToRegularPaymentDtoOptions,
  ): RegularPaymentDto {
    const category =
      payment.category && typeof payment.category === 'object'
        ? this.categoryService.toCategoryDto(
            payment.category as CategoryDocument,
          )
        : null;
    const account =
      payment.account && typeof payment.account === 'object'
        ? this.accountService.toAccountDto(payment.account as AccountDocument)
        : null;

    if (!category || !account) {
      throw new Error(
        'Regular payment must have category and account populated before mapping to DTO',
      );
    }

    const value = this.moneyService.fromMinorUnits(
      payment.amount,
      payment.scale,
    );
    const moneyOriginal: MoneyViewDto = {
      value,
      raw: payment.amount,
      scale: payment.scale,
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

    const tags = Array.isArray(payment.tags)
      ? (payment.tags as TagDocument[])
          .filter(
            (t): t is TagDocument => t && typeof t === 'object' && '_id' in t,
          )
          .map((t) => this.tagService.toTagDto(t))
      : [];

    return {
      id: payment._id.toString(),
      account,
      type: payment.type,
      category,
      comment: payment.comment ?? '',
      tags,
      amount: {
        original: moneyOriginal,
        converted: converted ?? moneyOriginal,
      },
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }
}
