import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Index('battle_history_end_time_index', ['end_time'], {})
@Index('battle_history_usernamea_index', ['usernamea'], {})
@Index('battle_history_usernameb_index', ['usernameb'], {})
@Entity('battle_history', { schema: 'public' })
export class BattleHistory {
  @PrimaryColumn('character varying', { name: 'usernamea', length: 100 })
  usernamea: string;

  @PrimaryColumn('character varying', { name: 'usernameb', length: 100 })
  usernameb: string;

  @Column('integer', { name: 'userscorea', default: 0 })
  userscorea: number;

  @Column('integer', { name: 'userscoreb', default: 0 })
  userscoreb: number;

  @Column('double precision', {
    name: 'expa',
    nullable: true,
    precision: 53,
    default: 0,
  })
  expa: number;

  @Column('double precision', {
    name: 'expb',
    nullable: true,
    precision: 53,
    default: 0,
  })
  expb: number;

  @Column('double precision', {
    name: 'expa_ex',
    nullable: true,
    precision: 53,
    default: 0,
  })
  expa_ex: number;

  @Column('double precision', {
    name: 'expb_ex',
    nullable: true,
    precision: 53,
    default: 0,
  })
  expb_ex: number;

  @Column('double precision', {
    name: 'pta',
    nullable: true,
    precision: 53,
    default: 0,
  })
  pta: number;

  @Column('double precision', {
    name: 'ptb',
    nullable: true,
    precision: 53,
    default: 0,
  })
  ptb: number;

  @Column('double precision', {
    name: 'pta_ex',
    nullable: true,
    precision: 53,
    default: 0,
  })
  pta_ex: number;

  @Column('double precision', {
    name: 'ptb_ex',
    nullable: true,
    precision: 53,
    default: 0,
  })
  ptb_ex: number;

  @Column('character varying', { name: 'type', length: 100 })
  type: string;

  @Column('timestamp without time zone', { name: 'start_time', nullable: true })
  start_time: Date;

  @PrimaryColumn('timestamp without time zone', {
    name: 'end_time',
  })
  end_time: Date;

  @Column('text', { name: 'winner', nullable: true })
  winner: string;

  @Column('boolean', {
    name: 'isfirstwin',
    nullable: true,
    default: 'false',
  })
  isfirstwin: boolean;

  @Column('character varying', {
    name: 'decka',
    nullable: true,
    default: "''",
  })
  decka: string;

  @Column('character varying', {
    name: 'deckb',
    nullable: true,
    default: "''",
  })
  deckb: string;
}
