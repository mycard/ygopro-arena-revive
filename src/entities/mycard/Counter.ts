import { Column, Entity, Index } from 'typeorm';

@Index('counter_environment', ['source', 'time', 'timeperiod'], {
  unique: true,
})
@Entity('counter', { schema: 'public' })
export class Counter {
  @Column('date', { primary: true, name: 'time' })
  time: string;

  @Column('integer', { primary: true, name: 'timeperiod', default: 1 })
  timeperiod: number;

  @Column('character varying', {
    primary: true,
    name: 'source',
    default: "'unknown'",
  })
  source: string;

  @Column('integer', { name: 'count', nullable: true })
  count: number;
}
