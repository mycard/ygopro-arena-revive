import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('deck_info_history', { schema: 'public' })
export class DeckInfoHistory {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'name', length: 100 })
  name: string;

  @Column('text', { name: 'content', nullable: true })
  content: string;

  @Column('timestamp without time zone', { name: 'start_time', nullable: true })
  startTime: Date;

  @Column('timestamp without time zone', { name: 'end_time', nullable: true })
  endTime: Date;
}
