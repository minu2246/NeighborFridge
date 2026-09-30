import { IsIn } from 'class-validator';
import { MutablePostStatus } from '../post.types';

export class UpdatePostStatusDto {
  @IsIn(['ACTIVE', 'RESERVED', 'COMPLETED'])
  status!: MutablePostStatus;
}
