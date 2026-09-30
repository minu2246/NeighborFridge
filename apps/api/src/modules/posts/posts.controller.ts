import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.types';
import { CreatePostDto } from './dto/create-post.dto';
import { FindNearbyPostsDto } from './dto/find-nearby-posts.dto';
import { PostRecord } from './post.types';
import { PostsService } from './posts.service';
import { UpdatePostDto } from './dto/update-post.dto';
import { UpdatePostStatusDto } from './dto/update-post-status.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreatePostDto,
  ): Promise<PostRecord> {
    return this.postsService.create(user.id, input);
  }

  @Get('nearby')
  findNearby(@Query() input: FindNearbyPostsDto): Promise<PostRecord[]> {
    return this.postsService.findNearby(input);
  }

  @Get(':id')
  getById(@Param('id') id: string): Promise<PostRecord> {
    return this.postsService.getById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdatePostDto,
  ): Promise<PostRecord> {
    return this.postsService.update(user.id, id, input);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() input: UpdatePostStatusDto,
  ): Promise<PostRecord> {
    return this.postsService.updateStatus(user.id, id, input);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.postsService.delete(user.id, id);
  }
}
