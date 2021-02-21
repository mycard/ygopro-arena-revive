import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ads', { schema: 'public' })
export class Ads {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', {
    name: 'name',
    nullable: true,
    length: 100,
  })
  name: string;

  @Column('text', { name: 'desctext', nullable: true })
  desctext: string;

  @Column('character varying', {
    name: 'imgp_url',
    nullable: true,
    length: 1000,
  })
  imgp_url: string;

  @Column('character varying', {
    name: 'imgm_url',
    nullable: true,
    length: 1000,
  })
  imgm_url: string;

  @Column('character varying', {
    name: 'click_ref',
    nullable: true,
    length: 1000,
  })
  click_ref: string;

  @Column('character varying', {
    name: 'click_url',
    nullable: true,
    length: 1000,
  })
  click_url: string;

  @Column('character varying', {
    name: 'impl_url',
    nullable: true,
    length: 1000,
  })
  impl_url: string;

  @Column('integer', { name: 'impl', nullable: true, default: 0 })
  impl: number;

  @Column('integer', { name: 'clk', nullable: true, default: 0 })
  clk: number;

  @Column('boolean', { name: 'status', nullable: true, default: 'false' })
  status: boolean;

  @Column('timestamp without time zone', {
    name: 'update_time',
    nullable: true,
  })
  update_time: Date;

  @Column('timestamp without time zone', {
    name: 'create_time',
    nullable: true,
  })
  create_time: Date;

  @Column('character varying', {
    name: 'type',
    nullable: true,
    length: 100,
    default: 1,
  })
  type: string;
}
