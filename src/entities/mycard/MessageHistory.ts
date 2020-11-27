import { Column, Entity } from 'typeorm';

@Entity('message_history', { schema: 'public' })
export class MessageHistory {
  @Column('timestamp without time zone', { name: 'time', nullable: true })
  time: Date;

  @Column('character varying', { name: 'sender', nullable: true })
  sender: string;

  @Column('character varying', { name: 'content', nullable: true })
  content: string;

  @Column('integer', { name: 'level', nullable: true })
  level: number;

  @Column('character varying', { name: 'match', nullable: true })
  match: string;

  @Column('character varying', { name: 'ip', nullable: true })
  ip: string;
}
