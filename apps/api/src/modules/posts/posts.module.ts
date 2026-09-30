import { Module } from '@nestjs/common';
import { ExpiryScheduler } from './expiry.scheduler';
import { PostsController } from './posts.controller';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';

@Module({
  controllers: [PostsController],
  providers: [PostsRepository, PostsService, ExpiryScheduler],
})
export class PostsModule {}
