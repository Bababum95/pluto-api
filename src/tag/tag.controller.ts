import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { TagService } from './tag.service';
import { CreateTagDto, UpdateTagDto, TagDto } from './tag.dto';
import { UserDecorator } from '../auth/user.decorator';
import type { RequestUser } from '../auth/auth.dto';

@ApiTags('tags')
@ApiBearerAuth()
@Controller('tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiResponse({
    status: 201,
    description: 'The tag has been successfully created.',
    type: TagDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 409, description: 'Tag name already exists.' })
  async create(
    @UserDecorator() user: RequestUser,
    @Body() createTagDto: CreateTagDto,
  ): Promise<TagDto> {
    const tag = await this.tagService.create(user.userId, createTagDto);
    return this.tagService.toTagDto(tag);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tags for the current user' })
  @ApiResponse({
    status: 200,
    description: 'List of all tags for the current user.',
    type: [TagDto],
  })
  async findAll(@UserDecorator() user: RequestUser): Promise<TagDto[]> {
    const tags = await this.tagService.findAll(user.userId);
    return tags.map((tag) => this.tagService.toTagDto(tag));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'The tag.',
    type: TagDto,
  })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  async findOne(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<TagDto> {
    const tag = await this.tagService.findOne(user.userId, id);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return this.tagService.toTagDto(tag);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tag by ID' })
  @ApiResponse({
    status: 200,
    description: 'The tag has been successfully updated.',
    type: TagDto,
  })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  @ApiResponse({ status: 409, description: 'Tag name already exists.' })
  async update(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
  ): Promise<TagDto> {
    const tag = await this.tagService.update(user.userId, id, updateTagDto);
    return this.tagService.toTagDto(tag);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tag by ID' })
  @ApiResponse({
    status: 204,
    description: 'The tag has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  async remove(
    @UserDecorator() user: RequestUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.tagService.remove(user.userId, id);
  }
}
