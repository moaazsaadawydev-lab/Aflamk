import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Country, UserGender, UserRole } from '@booking-ticket-system/Utils';

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

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
    nullable: false,
  })
  role!: UserRole;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'int', nullable: true })
  verificationCode!: number;

  @Column({ type: 'timestamp', nullable: true })
  verificationCodeExpiresAt!: Date;

  @Column({ type: 'boolean', default: false })
  isBlocked!: boolean;

  @Column({ type: 'timestamp', nullable: true, default: null })
  lastBlockedAt!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  blockReason!: string | null;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;
}
