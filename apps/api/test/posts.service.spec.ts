import { BadRequestException } from '@nestjs/common';
import { CreatePostDto } from '../src/modules/posts/dto/create-post.dto';
import { FindNearbyPostsDto } from '../src/modules/posts/dto/find-nearby-posts.dto';
import { PostsRepository } from '../src/modules/posts/posts.repository';
import { PostsService } from '../src/modules/posts/posts.service';

describe('PostsService', () => {
  const repository = {
    create: jest.fn(),
    findNearby: jest.fn(),
  } as unknown as PostsRepository;
  const service = new PostsService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('rejects an already expired post before querying the database', async () => {
    const input = { expiryDate: '2000-01-01' } as CreatePostDto;
    expect(() => service.create(input)).toThrow(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('delegates nearby search parameters to the repository', async () => {
    const query = {
      latitude: 37.5665,
      longitude: 126.978,
      radiusKm: 3,
      sort: 'distance',
      limit: 20,
      offset: 0,
    } as FindNearbyPostsDto;
    (repository.findNearby as jest.Mock).mockResolvedValue([]);
    await expect(service.findNearby(query)).resolves.toEqual([]);
    expect(repository.findNearby).toHaveBeenCalledWith(query);
  });
});
