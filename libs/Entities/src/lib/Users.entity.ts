import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  Country,
  UserGender,
  UserRole,
  UserStatus,
} from '@booking-ticket-system/Utils';
import { TIMESTAMP } from '@booking-ticket-system/Constants';
import type { UserEmailHistory } from './UserEmailHistory.entity';

export { UserStatus };

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

  @Index()
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.UNVERIFIED,
    nullable: false,
  })
  status!: UserStatus;

  @Column({ type: 'varchar', length: 500, nullable: true, default: null })
  statusReason!: string | null;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  suspendedUntil!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  statusChangedAt!: Date | null;

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
