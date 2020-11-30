import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('message_history', { schema: 'public' })
export class MessageHistory {
  @Column('timestamp without time zone', {
    name: 'time',
    nullable: true,
  })
  time: Date;

  @PrimaryColumn('character varying', { name: 'sender' })
  sender: string;

  @PrimaryColumn('character varying', { name: 'content' })
  content: string;

  @Column('integer', { name: 'level', nullable: true })
  level: number;

  @Column('character varying', { name: 'match', nullable: true })
  match: string;

  @Column('character varying', { name: 'ip', nullable: true })
  ip: string;
}
