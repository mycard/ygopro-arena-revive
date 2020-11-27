import { Column, Entity, Index } from 'typeorm';

@Index(
  'card_environment_single_season',
  ['category', 'id', 'source', 'time', 'timeperiod'],
  { unique: true },
)
@Entity('single_season', { schema: 'public' })
export class SingleSeason {
  @Column('integer', { primary: true, name: 'id' })
  id: number;

  @Column('character varying', { primary: true, name: 'category' })
  category: string;

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

  @Column('integer', { name: 'frequency', nullable: true, default: 0 })
  frequency: number;

  @Column('integer', { name: 'numbers', nullable: true, default: 0 })
  numbers: number;

  @Column('integer', { name: 'putone', nullable: true, default: 0 })
  putone: number;

  @Column('integer', { name: 'puttwo', nullable: true, default: 0 })
  puttwo: number;

  @Column('integer', { name: 'putthree', nullable: true, default: 0 })
  putthree: number;

  @Column('integer', {
    name: 'putoverthree',
    nullable: true,
    default: 0,
  })
  putoverthree: number;
}
