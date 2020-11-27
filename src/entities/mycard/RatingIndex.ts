import {Column, Entity, PrimaryColumn} from 'typeorm';

@Entity('rating_index', { schema: 'public' })
export class RatingIndex {
  @PrimaryColumn('character varying', {
    name: 'username',
    length: 50,
    default: 0,
  })
  username: string;

  @Column('integer', { name: 'exp', default: 800 })
  exp: number;

  @Column('character varying', { name: 'o', length: 6, default: 25 })
  o: string;

  @Column('character varying', { name: 'u', length: 6, default: 25 })
  u: string;

  @Column('double precision', {
    name: 'pt',
    nullable: true,
    precision: 53,
    default: 800,
  })
  pt: number;

  @Column('character varying', { name: 'game', length: 6, default: 0 })
  game: string;

  @Column('character varying', { name: 'win', length: 6, default: 0 })
  win: string;

  @Column('character varying', { name: 'lose', length: 6, default: 0 })
  lose: string;

  @Column('character varying', {
    name: 'last',
    length: 6,
    default: "'-1'",
  })
  last: string;

  @Column('character varying', {
    name: 'status',
    length: 6,
    default: 0,
  })
  status: string;
}
