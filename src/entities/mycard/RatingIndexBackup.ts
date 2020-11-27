import { Column, Entity } from 'typeorm';

@Entity('rating_index_backup', { schema: 'public' })
export class RatingIndexBackup {
  @Column('character varying', { name: 'username', nullable: true, length: 50 })
  username: string;

  @Column('integer', { name: 'exp', nullable: true })
  exp: number;

  @Column('character varying', { name: 'o', nullable: true, length: 6 })
  o: string;

  @Column('character varying', { name: 'u', nullable: true, length: 6 })
  u: string;

  @Column('double precision', { name: 'pt', nullable: true, precision: 53 })
  pt: number;

  @Column('character varying', { name: 'game', nullable: true, length: 6 })
  game: string;

  @Column('character varying', { name: 'win', nullable: true, length: 6 })
  win: string;

  @Column('character varying', { name: 'lose', nullable: true, length: 6 })
  lose: string;

  @Column('character varying', { name: 'last', nullable: true, length: 6 })
  last: string;

  @Column('character varying', { name: 'status', nullable: true, length: 6 })
  status: string;
}
