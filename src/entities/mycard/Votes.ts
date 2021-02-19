import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('votes_pk', ['id'], { unique: true })
@Entity('votes', { schema: 'public' })
export class Votes {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('text', { name: 'title', nullable: true })
  title: string;

  @Column('text', { name: 'options', nullable: true })
  options: string;

  @Column('timestamp without time zone', {
    name: 'create_time',
    nullable: true,
  })
  createTime: Date;

  @Column('timestamp without time zone', { name: 'start_time', nullable: true })
  startTime: Date;

  @Column('timestamp without time zone', { name: 'end_time', nullable: true })
  endTime: Date;

  @Column('boolean', { name: 'status', nullable: true, default: false })
  status: boolean;

  @Column('boolean', {
    name: 'multiple',
    nullable: true,
    default: 'false',
  })
  multiple: boolean;

  @Column('integer', { name: 'max', nullable: true, default: 2 })
  max: number;
}
