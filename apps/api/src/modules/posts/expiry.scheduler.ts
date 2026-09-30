import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PostsRepository } from './posts.repository';

@Injectable()
export class ExpiryScheduler {
  private readonly logger = new Logger(ExpiryScheduler.name);

  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 */15 * * * *', { name: 'expire-posts', timeZone: 'Asia/Seoul' })
  async expirePosts(): Promise<number> {
    if (this.config.get<string>('ENABLE_EXPIRY_SCHEDULER', 'true') !== 'true') return 0;
    const ids = await this.postsRepository.expirePastDue();
    if (ids.length > 0) this.logger.log(`Expired ${ids.length} posts`);
    return ids.length;
  }
}
