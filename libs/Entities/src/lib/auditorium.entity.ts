import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExperienceType } from '@booking-ticket-system/Utils';
import { TIMESTAMP } from '@booking-ticket-system/Constants';
import type { Cinema } from './cinema.entity';
import type { Seat } from './seat.entity';
import type { Showtime } from './showtime.entity';

@Entity('auditoriums')
@Index(['cinemaId', 'name'], { unique: true, where: 'deleted_at IS NULL' })
export class Auditorium {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'cinema_id', type: 'uuid', nullable: false })
  cinemaId!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  @Column({
    name: 'experience_type',
    type: 'enum',
    enum: ExperienceType,
    nullable: false,
  })
  experienceType!: ExperienceType;

  @Column({
    name: 'sound_system',
    type: 'varchar',
    length: 50,
    nullable: true,
    default: null,
  })
  soundSystem!: string | null;

  @Column({ name: 'total_rows', type: 'int', nullable: false })
  totalRows!: number;

  @Column({ name: 'total_columns', type: 'int', nullable: false })
  totalColumns!: number;

  @Column({ name: 'total_seats', type: 'int', nullable: false })
  totalSeats!: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
    nullable: false,
  })
  isActive!: boolean;

  @ManyToOne('Cinema', (cinema: Cinema) => cinema.auditoriums, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cinema_id' })
  cinema!: Cinema;

  @OneToMany('Seat', (seat: Seat) => seat.auditorium, { cascade: true })
  seats!: Seat[];

  @OneToMany('Showtime', (showtime: Showtime) => showtime.auditorium)
  showtimes!: Showtime[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => TIMESTAMP,
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => TIMESTAMP,
    onUpdate: TIMESTAMP,
  })
  updatedAt!: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamp',
    nullable: true,
    default: null,
  })
  deletedAt?: Date | null;
}
