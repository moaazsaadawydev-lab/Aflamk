import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TIMESTAMP } from '@booking-ticket-system/Constants';
import { NotificationType } from '@booking-ticket-system/Utils';

@Entity({ name: 'notifications' })
export class NotificationsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  userId!: string;

  @Column('enum', {
    enum: NotificationType,
    default: NotificationType.NORMAL_MESSAGE,
  })
  type!: NotificationType;

  @Column('varchar')
  title!: string;

  @Column('varchar')
  body!: string;

  @Column('boolean', { default: false })
  isRead!: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => TIMESTAMP })
  createdAt!: Date;
}
