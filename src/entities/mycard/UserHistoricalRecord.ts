import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('user_historical_record_pk', ['season', 'username'], { unique: true })
@Entity('user_historical_record', { schema: 'public' })
export class UserHistoricalRecord {
  @PrimaryColumn('character varying', { primary: true, name: 'username' })
  username: string;

  @Column('character varying', { primary: true, name: 'season' })
  season: string;

  @Column('character varying', { name: 'note', nullable: true })
  note: string;

  @Column('integer', { name: 'rank', nullable: true })
  rank: number;

  @Column('double precision', {
    name: 'pt',
    nullable: true,
    precision: 53,
    default: 1000,
  })
  pt: number;

  @Column('double precision', {
    name: 'correction',
    nullable: true,
    precision: 53,
    default: 0,
  })
  correction: number;

  @Column('integer', {
    name: 'athletic_win',
    nullable: true,
    default: 0,
  })
  athleticWin: number;

  @Column('integer', {
    name: 'athletic_draw',
    nullable: true,
    default: 0,
  })
  athleticDraw: number;

  @Column('integer', {
    name: 'athletic_lose',
    nullable: true,
    default: 0,
  })
  athleticLose: number;

  @Column('integer', {
    name: 'entertainment_win',
    nullable: true,
    default: 0,
  })
  entertainmentWin: number;

  @Column('integer', {
    name: 'entertainment_draw',
    nullable: true,
    default: 0,
  })
  entertainmentDraw: number;

  @Column('integer', {
    name: 'entertainment_lose',
    nullable: true,
    default: 0,
  })
  entertainmentLose: number;
}
