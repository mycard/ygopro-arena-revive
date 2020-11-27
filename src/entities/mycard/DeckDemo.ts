import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('deck_demo', { schema: 'public' })
export class DeckDemo {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', length: 100 })
  name: string;

  @Column('character varying', { name: 'author', length: 100 })
  author: string;

  @Column('text', { name: 'url' })
  url: string;

  @Column('character varying', { name: 'title', length: 100 })
  title: string;

  @Column('character varying', { name: 'file', length: 100 })
  file: string;

  @Column('timestamp without time zone', {
    name: 'create_time',
    nullable: true,
  })
  createTime: Date;
}
