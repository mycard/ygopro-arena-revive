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
  entertainWin: number;

  @Column('integer', { name: 'entertain_lose', default: 0 })
  entertainLose: number;

  @Column('integer', { name: 'entertain_draw', default: 0 })
  entertainDraw: number;

  @Column('integer', { name: 'entertain_all', default: 0 })
  entertainAll: number;

  @Column('integer', { name: 'athletic_win', default: 0 })
  athleticWin: number;

  @Column('integer', { name: 'athletic_lose', default: 0 })
  athleticLose: number;

  @Column('integer', { name: 'athletic_draw', default: 0 })
  athleticDraw: number;

  @Column('integer', { name: 'athletic_all', default: 0 })
  athleticAll: number;

  @Column('integer', { name: 'id', nullable: true })
  id: number;
}
