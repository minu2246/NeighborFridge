import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExpiryScheduler } from './expiry.scheduler';
import { PostsController } from './posts.controller';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';
import { ReviewsController } from './reviews.controller';

@Module({
  imports: [AuthModule],
  controllers: [PostsController, ReviewsController],
  providers: [PostsRepository, PostsService, ExpiryScheduler],
})
export class PostsModule {}
