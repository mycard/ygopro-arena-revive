import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('unknown_decks', { schema: 'public' })
export class UnknownDecks {
  @Column('character varying', { name: 'deck', nullable: true })
  deck: string;

  @Column('character varying', { name: 'username', nullable: true })
  username: string;

  @Column('character varying', { name: 'source', nullable: true })
  source: string;

  @Column('timestamp without time zone', { name: 'time', nullable: true })
  time: Date;

  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;
}
