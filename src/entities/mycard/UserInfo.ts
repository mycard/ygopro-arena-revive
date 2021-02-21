import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('user_info', { schema: 'public' })
export class UserInfo {
  @PrimaryColumn('character varying', { name: 'username', length: 100 })
  username: string;

  @Column('double precision', {
    name: 'exp',
    precision: 53,
    default: 0,
  })
  exp: number;

  @Column('double precision', {
    name: 'pt',
    precision: 53,
    default: 1000,
  })
  pt: number;

  @Column('integer', { name: 'entertain_win', default: 0 })
  entertain_win: number;

  @Column('integer', { name: 'entertain_lose', default: 0 })
  entertain_lose: number;

  @Column('integer', { name: 'entertain_draw', default: 0 })
  entertain_draw: number;

  @Column('integer', { name: 'entertain_all', default: 0 })
  entertain_all: number;

  @Column('integer', { name: 'athletic_win', default: 0 })
  athletic_win: number;

  @Column('integer', { name: 'athletic_lose', default: 0 })
  athletic_lose: number;

  @Column('integer', { name: 'athletic_draw', default: 0 })
  athletic_draw: number;

  @Column('integer', { name: 'athletic_all', default: 0 })
  athletic_all: number;

  @Column('integer', { name: 'id', nullable: true })
  id: number;
}
