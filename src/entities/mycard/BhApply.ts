import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bh_apply', { schema: 'public' })
export class BhApply {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', {
    name: 'userid',
    nullable: true,
    length: 100,
  })
  userid: string;

  @Column('character varying', {
    name: 'type',
    nullable: true,
    length: 100,
  })
  type: string;

  @Column('timestamp without time zone', {
    name: 'create_time',
    nullable: true,
  })
  createTime: Date;
}
