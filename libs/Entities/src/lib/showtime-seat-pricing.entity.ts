import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { SeatType } from '@booking-ticket-system/Utils';
import { TIMESTAMP } from '@booking-ticket-system/Constants';
import type { Showtime } from './showtime.entity';

@Entity('showtime_seat_pricing')
@Unique(['showtimeId', 'seatType'])
export class ShowtimeSeatPricing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'showtime_id', type: 'uuid', nullable: false })
  showtimeId!: string;

  @Column({
    name: 'seat_type',
    type: 'enum',
    enum: SeatType,
    nullable: false,
  })
  seatType!: SeatType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
  })
  price!: number;

  @ManyToOne('Showtime', (showtime: Showtime) => showtime.seatPricings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'showtime_id' })
  showtime!: Showtime;

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
}
