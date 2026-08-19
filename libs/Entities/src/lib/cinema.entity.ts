import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TIMESTAMP } from '@booking-ticket-system/Constants';
import type { Auditorium } from './auditorium.entity';

@Entity('cinemas')
export class Cinema {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 160, unique: true, nullable: false })
  slug!: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: false })
  city!: string;

  @Column({ type: 'text', nullable: false })
  address!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 8,
    nullable: true,
    default: null,
  })
  latitude!: number | null;

  @Column({
    type: 'decimal',
    precision: 11,
    scale: 8,
    nullable: true,
    default: null,
  })
  longitude!: number | null;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: null,
  })
  phoneNumber!: string | null;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
    default: null,
  })
  facilities!: string[] | null;

  @Column({ name: 'is_active', type: 'boolean', default: true, nullable: false })
  isActive!: boolean;

  @OneToMany('Auditorium', (auditorium: Auditorium) => auditorium.cinema, {
    cascade: true,
  })
  auditoriums!: Auditorium[];

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
