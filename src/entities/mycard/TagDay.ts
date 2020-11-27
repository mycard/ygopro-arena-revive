import { Column, Entity, Index } from 'typeorm';

@Index('card_environment_tag_day', ['name', 'source', 'time', 'timeperiod'], {
  unique: true,
})
@Index('tag_day_time_index', ['time'], {})
@Entity('tag_day', { schema: 'public' })
export class TagDay {
  @Column('character varying', { primary: true, name: 'name' })
  name: string;

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

  @Column('integer', { name: 'count', nullable: true, default: 0 })
  count: number;
}
