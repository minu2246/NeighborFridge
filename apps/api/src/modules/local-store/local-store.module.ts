import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LocalStoreController } from './local-store.controller';
import { LocalStoreService } from './local-store.service';

@Module({ imports: [AuthModule], controllers: [LocalStoreController], providers: [LocalStoreService] })
export class LocalStoreModule {}
