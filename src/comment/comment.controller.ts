import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Put
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email?: string;
  };
}


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
  @Get('/user')
    getUserComments(
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '20',
      @Request() req
    ) {
      return this.commentsService.findUserComments(req.user.id, parseInt(page), parseInt(limit));
    }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commentsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':rootId/tree')
  findCommentTree(
    @Param('rootId') rootId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Request() req: RequestWithUser
  ) {
    const userId = (req.user as any)?.id; // or req.user['sub'] depending on how you define payload
    return this.commentsService.findCommentTree(rootId, parseInt(page), parseInt(limit), userId);
  }
    @Get('thread/:id')
    async getThread(@Param('id') id: string, @Request() req) {
      const userId = req.user?.id; // if using JWT
      return this.commentsService.findCommentTree(id, 1, 50, userId);
    }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req
  ) {
    return this.commentsService.update(id, updateCommentDto, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.commentsService.remove(id, req.user.id);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @Request() req) {
    return this.commentsService.restore(id, req.user.id);
  }
}
