// src/comments/comments.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ParseUUIDPipe } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentService) {}

  @Post()
  create(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    return this.commentsService.create(createCommentDto, req.user.id);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.commentsService.findAll(parseInt(page), parseInt(limit));
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.commentsService.findById(id);
  }

  @Get(':rootId/tree')
  findCommentTree(
    @Param('rootId', ParseUUIDPipe) rootId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50'
  ) {
    return this.commentsService.findCommentTree(rootId, parseInt(page), parseInt(limit));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req
  ) {
    return this.commentsService.update(id, updateCommentDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.commentsService.remove(id, req.user.id);
  }

  @Post(':id/restore')
  restore(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.commentsService.restore(id, req.user.id);
  }
}