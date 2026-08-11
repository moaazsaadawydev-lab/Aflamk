import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TIMESTAMP } from '@booking-ticket-system/Constants';
import { Users } from './Users.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', nullable: false })
  userId!: string;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Users;

  @Column({ type: 'varchar', length: 255, nullable: false })
  refreshTokenHash!: string;

  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: null })
  ipAddress!: string | null;

  @Column({ type: 'timestamp', nullable: false })
  expiresAt!: Date;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => TIMESTAMP,
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => TIMESTAMP,
    onUpdate: TIMESTAMP,
  })
  lastUsedAt!: Date;
}
