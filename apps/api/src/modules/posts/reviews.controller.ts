import { Body, Controller, Get, HttpCode, HttpStatus, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsUUID } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/jwt.types';
import { NEGATIVE_PRAISES, PendingReview, POSITIVE_PRAISES, ReceivedReview, REVIEW_RATINGS, ReviewRating } from './post.types';
import { PostsService } from './posts.service';

class CreateReviewDto {
  @IsUUID()
  postId!: string;

  @IsIn(REVIEW_RATINGS)
  rating!: ReviewRating;

  // 칭찬/아쉬운 점 항목(선택). 평가와 맞는 항목인지는 서비스에서 확인
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(POSITIVE_PRAISES.length)
  @IsIn([...POSITIVE_PRAISES, ...NEGATIVE_PRAISES], { each: true })
  praises?: string[];
}

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly postsService: PostsService) {}

  @Get('pending')
  listPending(@CurrentUser() user: AuthenticatedUser): Promise<PendingReview[]> {
    return this.postsService.listPendingReviews(user.id);
  }

  // 받은 후기(최근 20개). userId 없으면 내 후기, 있으면 그 이웃의 후기
  @Get('received')
  listReceived(
    @CurrentUser() user: AuthenticatedUser,
    @Query('userId', new ParseUUIDPipe({ optional: true })) userId?: string,
  ): Promise<ReceivedReview[]> {
    return this.postsService.listReceivedReviews(userId ?? user.id);
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateReviewDto): Promise<void> {
    return this.postsService.createReview(user.id, input.postId, input.rating, input.praises);
  }
}
