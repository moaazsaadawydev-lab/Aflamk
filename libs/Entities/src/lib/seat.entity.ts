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
import type { Auditorium } from './auditorium.entity';

@Entity('seats')
@Unique(['auditoriumId', 'rowLabel', 'seatNumber'])
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'auditorium_id', type: 'uuid', nullable: false })
  auditoriumId!: string;

  @Column({ name: 'row_label', type: 'varchar', length: 5, nullable: false })
  rowLabel!: string;

  @Column({ name: 'seat_number', type: 'int', nullable: false })
  seatNumber!: number;

  @Column({ name: 'grid_row', type: 'int', nullable: false })
  gridRow!: number;

  @Column({ name: 'grid_column', type: 'int', nullable: false })
  gridColumn!: number;

  @Column({
    name: 'seat_type',
    type: 'enum',
    enum: SeatType,
    default: SeatType.REGULAR,
    nullable: false,
  })
  seatType!: SeatType;

  @Column({
    name: 'is_operational',
    type: 'boolean',
    default: true,
    nullable: false,
  })
  isOperational!: boolean;

  @ManyToOne('Auditorium', (auditorium: Auditorium) => auditorium.seats, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'auditorium_id' })
  auditorium!: Auditorium;

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
