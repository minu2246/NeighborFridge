import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { IsIn, IsUUID } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.types';
import { PendingReview, REVIEW_RATINGS, ReviewRating } from './post.types';
import { PostsService } from './posts.service';

class CreateReviewDto {
  @IsUUID()
  postId!: string;

  @IsIn(REVIEW_RATINGS)
  rating!: ReviewRating;
}

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('pending')
  listPending(@CurrentUser() user: AuthenticatedUser): Promise<PendingReview[]> {
    return this.postsService.listPendingReviews(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateReviewDto): Promise<void> {
    return this.postsService.createReview(user.id, input.postId, input.rating);
  }
}
