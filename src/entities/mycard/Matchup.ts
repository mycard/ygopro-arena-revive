import { Column, Entity, Index } from 'typeorm';

@Index('matchup_pk', ['decka', 'deckb', 'period', 'source'], { unique: true })
@Entity('matchup', { schema: 'public' })
export class Matchup {
  @Column('character varying', { primary: true, name: 'source' })
  source: string;

  @Column('character varying', { primary: true, name: 'decka' })
  decka: string;

  @Column('character varying', { primary: true, name: 'deckb' })
  deckb: string;

  @Column('character varying', { primary: true, name: 'period' })
  period: string;

  @Column('integer', { name: 'draw', nullable: true })
  draw: number;

  @Column('integer', { name: 'lose', nullable: true })
  lose: number;

  @Column('integer', { name: 'win', nullable: true })
  win: number;
}
