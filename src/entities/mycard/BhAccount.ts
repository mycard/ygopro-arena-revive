import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('unique_account', ['account', 'passwd'], { unique: true })
@Entity('bh_account', { schema: 'public' })
export class BhAccount {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', {
    name: 'account',
    nullable: true,
    unique: true,
    length: 100,
  })
  account: string;

  @Column('character varying', {
    name: 'passwd',
    nullable: true,
    unique: true,
    length: 100,
  })
  passwd: string;

  @Column('character varying', {
    name: 'userid',
    nullable: true,
    length: 100,
  })
  userid: string;

  @Column('timestamp without time zone', {
    name: 'create_time',
    nullable: true,
    default: 'now()',
  })
  createTime: Date;
}
