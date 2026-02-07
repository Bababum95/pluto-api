import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { I18n, I18nContext } from 'nestjs-i18n';

import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserDto } from './users.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOkResponse({ type: UserDto })
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists.',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    const user = await this.usersService.create(createUserDto);
    return this.usersService.toUserDto(user);
  }

  @Get()
  @ApiOkResponse({ type: [UserDto] })
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'List of all users.',
    type: [UserDto],
  })
  async findAll(): Promise<UserDto[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => this.usersService.toUserDto(user));
  }

  @Get('email/:email')
  @ApiOkResponse({ type: UserDto })
  @ApiOperation({ summary: 'Get a user by email' })
  @ApiResponse({ status: 200, description: 'The user.', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findByEmail(
    @Param('email') email: string,
    @I18n() i18n: I18nContext,
  ): Promise<UserDto> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(i18n.t('user.errors.notFound'));
    }
    return this.usersService.toUserDto(user);
  }

  @Get(':id')
  @ApiOkResponse({ type: UserDto })
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'The user.', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(
    @Param('id') id: string,
    @I18n() i18n: I18nContext,
  ): Promise<UserDto> {
    const user = await this.usersService.findOne(id);

    if (!user) throw new NotFoundException(i18n.t('user.errors.notFound'));

    return this.usersService.toUserDto(user);
  }

  @Patch(':id')
  @ApiOkResponse({ type: UserDto })
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDto> {
    const user = await this.usersService.update(id, updateUserDto);

    return this.usersService.toUserDto(user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async remove(
    @Param('id') id: string,
    @I18n() i18n: I18nContext,
  ): Promise<{ message: string }> {
    await this.usersService.remove(id);
    return { message: i18n.t('user.remove.success') };
  }
}
