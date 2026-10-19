import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { FindNearbyPostsDto } from './dto/find-nearby-posts.dto';
import { PendingReview, PostRecord, ReviewRating } from './post.types';
import { PostsRepository } from './posts.repository';
import { UpdatePostDto } from './dto/update-post.dto';
import { UpdatePostStatusDto } from './dto/update-post-status.dto';

@Injectable()
export class PostsService {
  constructor(private readonly postsRepository: PostsRepository) {}

  create(userId: string, input: CreatePostDto): Promise<PostRecord> {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (input.expiryDate < today) {
      throw new BadRequestException('이미 지난 소비기한은 등록할 수 없습니다.');
    }
    return this.postsRepository.create(userId, input);
  }

  findNearby(input: FindNearbyPostsDto): Promise<PostRecord[]> {
    return this.postsRepository.findNearby(input);
  }

  async getById(id: string): Promise<PostRecord> {
    const post = await this.postsRepository.findById(id);
    if (!post) throw new NotFoundException('게시물을 찾을 수 없습니다.');
    return post;
  }

  async update(userId: string, id: string, input: UpdatePostDto): Promise<PostRecord> {
    const post = await this.getOwnedPost(userId, id);
    if (!['ACTIVE', 'RESERVED'].includes(post.status)) {
      throw new ConflictException('현재 상태에서는 게시물을 수정할 수 없습니다.');
    }
    if ((input.latitude === undefined) !== (input.longitude === undefined)) {
      throw new BadRequestException('위도와 경도는 함께 입력해야 합니다.');
    }
    if (input.expiryDate && input.expiryDate < this.todayInSeoul()) {
      throw new BadRequestException('이미 지난 소비기한으로 변경할 수 없습니다.');
    }
    const updated = await this.postsRepository.update(id, input);
    if (!updated) throw new ConflictException('게시물 상태가 변경되어 수정할 수 없습니다.');
    return updated;
  }

  async updateStatus(
    userId: string,
    id: string,
    input: UpdatePostStatusDto,
  ): Promise<PostRecord> {
    const post = await this.getOwnedPost(userId, id);
    const allowedTransitions: Record<string, string[]> = {
      ACTIVE: ['RESERVED', 'COMPLETED'],
      RESERVED: ['ACTIVE', 'COMPLETED'],
      COMPLETED: [],
      EXPIRED: [],
      DELETED: [],
    };
    if (input.completedWith) {
      if (input.status !== 'COMPLETED') throw new BadRequestException('거래 상대는 거래 완료 시에만 지정할 수 있습니다.');
      if (!(await this.postsRepository.hasChatWith(id, input.completedWith))) {
        throw new BadRequestException('이 게시물로 채팅한 이웃만 거래 상대로 지정할 수 있습니다.');
      }
    }
    if (post.status === input.status) return post;
    if (!allowedTransitions[post.status].includes(input.status)) {
      throw new ConflictException(`${post.status} 상태에서 ${input.status} 상태로 변경할 수 없습니다.`);
    }
    const updated = await this.postsRepository.updateStatus(id, input.status, input.completedWith);
    if (!updated) throw new ConflictException('게시물 상태가 변경되어 처리할 수 없습니다.');
    return updated;
  }

  listPendingReviews(userId: string): Promise<PendingReview[]> {
    return this.postsRepository.listPendingReviews(userId);
  }

  async createReview(userId: string, postId: string, rating: ReviewRating): Promise<void> {
    if (!(await this.postsRepository.createReview(postId, userId, rating))) {
      throw new BadRequestException('후기를 남길 수 없는 거래이거나 이미 후기를 남겼습니다.');
    }
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.getOwnedPost(userId, id);
    if (!(await this.postsRepository.softDelete(id))) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }
  }

  private async getOwnedPost(userId: string, id: string): Promise<PostRecord> {
    const post = await this.getById(id);
    if (post.userId !== userId) throw new ForbiddenException('작성자만 변경할 수 있습니다.');
    return post;
  }

  private todayInSeoul(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  }
}
