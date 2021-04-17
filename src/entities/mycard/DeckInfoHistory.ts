import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DeckInfoOrHistory } from './DeckInfoOrHistory';

@Entity('deck_info_history', { schema: 'public' })
export class DeckInfoHistory implements DeckInfoOrHistory {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', length: 100 })
  name: string;

  @Column('text', { name: 'content', nullable: true })
  content: string;

  @Column('timestamp without time zone', { name: 'start_time', nullable: true })
  start_time: Date;

  @Column('timestamp without time zone', { name: 'end_time', nullable: true })
  end_time: Date;
}
