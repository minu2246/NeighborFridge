import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { MutablePostStatus } from '../post.types';

export class UpdatePostStatusDto {
  @IsIn(['ACTIVE', 'RESERVED', 'COMPLETED'])
  status!: MutablePostStatus;

  // 거래 완료 시 거래 상대(이 게시물로 채팅한 이웃). 없으면 앱 밖 거래로 보고 후기 없음.
  @IsOptional()
  @IsUUID()
  completedWith?: string;
}
