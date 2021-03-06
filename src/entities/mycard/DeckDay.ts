import { Column, Entity, Index } from 'typeorm';

@Index('card_environment_deck_day', ['name', 'source', 'time', 'timeperiod'], {
  unique: true,
})
@Index('deck_day_time_index', ['time'], {})
@Entity('deck_day', { schema: 'public' })
export class DeckDay {
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
