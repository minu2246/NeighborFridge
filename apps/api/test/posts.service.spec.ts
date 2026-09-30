import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreatePostDto } from '../src/modules/posts/dto/create-post.dto';
import { FindNearbyPostsDto } from '../src/modules/posts/dto/find-nearby-posts.dto';
import { PostsRepository } from '../src/modules/posts/posts.repository';
import { PostsService } from '../src/modules/posts/posts.service';

describe('PostsService', () => {
  const repository = {
    create: jest.fn(),
    findNearby: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as PostsRepository;
  const service = new PostsService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('rejects an already expired post before querying the database', async () => {
    const input = { expiryDate: '2000-01-01' } as CreatePostDto;
    expect(() => service.create('user-1', input)).toThrow(BadRequestException);
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

  it('prevents another user from editing a post', async () => {
    (repository.findById as jest.Mock).mockResolvedValue({
      id: 'post-1', userId: 'owner-1', status: 'ACTIVE',
    });
    await expect(service.update('other-user', 'post-1', { title: '변경' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('allows an owner to reserve an active post', async () => {
    const active = { id: 'post-1', userId: 'owner-1', status: 'ACTIVE' };
    const reserved = { ...active, status: 'RESERVED' };
    (repository.findById as jest.Mock).mockResolvedValue(active);
    (repository.updateStatus as jest.Mock).mockResolvedValue(reserved);
    await expect(service.updateStatus('owner-1', 'post-1', { status: 'RESERVED' }))
      .resolves.toEqual(reserved);
  });

  it('does not reopen a completed post', async () => {
    (repository.findById as jest.Mock).mockResolvedValue({
      id: 'post-1', userId: 'owner-1', status: 'COMPLETED',
    });
    await expect(service.updateStatus('owner-1', 'post-1', { status: 'ACTIVE' }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
