import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Country, UserGender, UserRole } from '@booking-ticket-system/Utils';
import { TIMESTAMP } from '@booking-ticket-system/Constants';
import type { UserEmailHistory } from './UserEmailHistory.entity';

@Entity()
export class Users {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password!: string;

  @Column({ type: 'int', nullable: false })
  age!: number;

  @Column({
    type: 'enum',
    enum: UserGender,
    nullable: false,
  })
  gender!: UserGender;

  @Column({
    type: 'enum',
    enum: Country,
    nullable: false,
  })
  country!: Country;

  @Column({ type: 'varchar', nullable: true, default: null })
  avatarKey!: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    nullable: false,
  })
  role!: UserRole;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'boolean', default: false })
  isBlocked!: boolean;

  @Column({ type: 'timestamp', nullable: true, default: null })
  lastBlockedAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  blockReason!: string | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  passwordChangedAt!: Date | null;

  @Column({ type: 'boolean', default: false, nullable: false })
  mustChangePassword!: boolean;

  @OneToMany('UserEmailHistory', 'user')
  emailHistory!: UserEmailHistory[];

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
  updatedAt!: Date;
}
