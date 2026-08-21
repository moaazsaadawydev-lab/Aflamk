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
import { ExperienceType, ShowtimeStatus } from '@booking-ticket-system/Utils';
import { TIMESTAMP } from '@booking-ticket-system/Constants';
import type { Movie } from './movie.entity';
import type { Auditorium } from './auditorium.entity';
import type { ShowtimeSeatPricing } from './showtime-seat-pricing.entity';

@Entity('showtimes')
export class Showtime {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'movie_id', type: 'uuid', nullable: false })
  movieId!: string;

  @Column({ name: 'auditorium_id', type: 'uuid', nullable: false })
  auditoriumId!: string;

  @Index()
  @Column({ name: 'start_time', type: 'timestamptz', nullable: false })
  startTime!: Date;

  @Index()
  @Column({ name: 'end_time', type: 'timestamptz', nullable: false })
  endTime!: Date;

  @Column({
    name: 'experience_type',
    type: 'enum',
    enum: ExperienceType,
    nullable: false,
  })
  experienceType!: ExperienceType;

  @Column({
    name: 'base_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  basePrice!: number;

  @Column({
    type: 'enum',
    enum: ShowtimeStatus,
    default: ShowtimeStatus.SCHEDULED,
    nullable: false,
  })
  status!: ShowtimeStatus;

  @ManyToOne('Movie', (movie: Movie) => movie.showtimes, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'movie_id' })
  movie!: Movie;

  @ManyToOne('Auditorium', (auditorium: Auditorium) => auditorium.showtimes, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'auditorium_id' })
  auditorium!: Auditorium;

  @OneToMany(
    'ShowtimeSeatPricing',
    (pricing: ShowtimeSeatPricing) => pricing.showtime,
    { cascade: true },
  )
  seatPricings!: ShowtimeSeatPricing[];

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
