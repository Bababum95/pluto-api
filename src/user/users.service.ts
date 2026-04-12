import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { User, UserDocument } from './user.schema';
import { ChangePasswordDto, CreateUserDto, UpdateUserDto, UserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly i18n: I18nService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existing = await this.userModel
      .findOne({ email: createUserDto.email.toLowerCase().trim() })
      .exec();
    if (existing) {
      throw new ConflictException(
        this.i18n.t('user.errors.emailAlreadyExists'),
      );
    }
    const user = new this.userModel(createUserDto);
    await user.save();
    const created = await this.userModel.findById(user._id).exec();
    if (!created) {
      throw new Error(this.i18n.t('user.create.failed'));
    }
    return created;
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  /**
   * Returns user document with password for auth validation (e.g. comparePassword).
   */
  async findOneByEmailWithPassword(
    email: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    if (updateUserDto.email) {
      const existing = await this.userModel
        .findOne({
          email: updateUserDto.email.toLowerCase().trim(),
          _id: { $ne: id },
        })
        .exec();
      if (existing) {
        throw new ConflictException(
          this.i18n.t('user.errors.emailAlreadyExists'),
        );
      }
    }
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();
    if (!user) {
      throw new NotFoundException(this.i18n.t('user.errors.notFound'));
    }
    return user;
  }

  async changePassword(
    id: string,
    dto: ChangePasswordDto,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('+password')
      .exec();

    if (!user) {
      throw new NotFoundException(this.i18n.t('user.errors.notFound'));
    }

    const isMatch = await user.comparePassword(dto.currentPassword);
    if (!isMatch) {
      throw new UnauthorizedException(
        this.i18n.t('user.errors.invalidPassword'),
      );
    }

    user.set({ password: dto.newPassword });
    await user.save();

    return user;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(this.i18n.t('user.errors.notFound'));
    }

    return true;
  }

  toUserDto(user: UserDocument): UserDto {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
