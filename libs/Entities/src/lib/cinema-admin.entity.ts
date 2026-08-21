import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TIMESTAMP } from '@booking-ticket-system/Constants';
import type { Cinema } from './cinema.entity';

@Entity('cinema_admins')
@Unique(['cinemaId', 'userId'])
export class CinemaAdmin {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'cinema_id', type: 'uuid', nullable: false })
  cinemaId!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @ManyToOne('Cinema', (cinema: Cinema) => cinema.admins, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cinema_id' })
  cinema!: Cinema;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => TIMESTAMP,
  })
  createdAt!: Date;
}
