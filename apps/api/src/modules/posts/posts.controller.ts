import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { FindNearbyPostsDto } from './dto/find-nearby-posts.dto';
import { PostRecord } from './post.types';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(@Body() input: CreatePostDto): Promise<PostRecord> {
    return this.postsService.create(input);
  }

  @Get('nearby')
  findNearby(@Query() input: FindNearbyPostsDto): Promise<PostRecord[]> {
    return this.postsService.findNearby(input);
  }
}
