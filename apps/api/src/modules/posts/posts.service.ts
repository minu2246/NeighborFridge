import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { FindNearbyPostsDto } from './dto/find-nearby-posts.dto';
import { PostRecord } from './post.types';
import { PostsRepository } from './posts.repository';

@Injectable()
export class PostsService {
  constructor(private readonly postsRepository: PostsRepository) {}

  create(input: CreatePostDto): Promise<PostRecord> {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    if (input.expiryDate < today) {
      throw new BadRequestException('이미 지난 소비기한은 등록할 수 없습니다.');
    }
    return this.postsRepository.create(input);
  }

  findNearby(input: FindNearbyPostsDto): Promise<PostRecord[]> {
    return this.postsRepository.findNearby(input);
  }
}
