import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Users } from './Users.entity';

@Entity('user_email_history')
export class UserEmailHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: false })
  @Index()
  userId!: string;

  @ManyToOne('Users', 'emailHistory', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: Users;

  @Column({ type: 'varchar', length: 255, nullable: false })
  previousEmail!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  newEmail!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  @Index()
  rollbackTokenHash!: string;

  @Column({ type: 'timestamptz', nullable: false })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false, nullable: false })
  isReverted!: boolean;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  revertedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
