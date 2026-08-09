import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TIMESTAMP } from '@booking-ticket-system/Constants';
import { EmailStatus, NotificationType } from '@booking-ticket-system/Utils';

@Entity({ name: 'notifications' })
export class NotificationsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { unique: true, nullable: true })
  sourceEventId!: string | null;

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

  @Column('varchar', { nullable: true })
  email!: string | null;

  @Column('varchar', { nullable: true })
  emailTemplate!: string | null;

  @Column('jsonb', { nullable: true })
  emailContext!: Record<string, any> | null;

  @Column('enum', {
    enum: EmailStatus,
    default: EmailStatus.PENDING,
  })
  emailStatus!: EmailStatus;

  @Column('int', { default: 0 })
  emailRetryCount!: number;

  @CreateDateColumn({ type: 'timestamp', default: () => TIMESTAMP })
  createdAt!: Date;
}
