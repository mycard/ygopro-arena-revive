import { Column, Entity } from 'typeorm';

@Entity('userinfo201812backup', { schema: 'public' })
export class Userinfo201812backup {
  @Column('character varying', {
    name: 'username',
    nullable: true,
    length: 100,
  })
  username: string;

  @Column('double precision', { name: 'exp', nullable: true, precision: 53 })
  exp: number;

  @Column('double precision', { name: 'pt', nullable: true, precision: 53 })
  pt: number;

  @Column('integer', { name: 'entertain_win', nullable: true })
  entertainWin: number;

  @Column('integer', { name: 'entertain_lose', nullable: true })
  entertainLose: number;

  @Column('integer', { name: 'entertain_draw', nullable: true })
  entertainDraw: number;

  @Column('integer', { name: 'entertain_all', nullable: true })
  entertainAll: number;

  @Column('integer', { name: 'athletic_win', nullable: true })
  athleticWin: number;

  @Column('integer', { name: 'athletic_lose', nullable: true })
  athleticLose: number;

  @Column('integer', { name: 'athletic_draw', nullable: true })
  athleticDraw: number;

  @Column('integer', { name: 'athletic_all', nullable: true })
  athleticAll: number;

  @Column('integer', { name: 'id', nullable: true })
  id: number;
}
