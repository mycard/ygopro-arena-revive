import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('user_ban_history', { schema: 'public' })
export class UserBanHistory {
  @Column('character varying', { name: 'username', nullable: true })
  username: string;

  @Column('character varying', { name: 'level', nullable: true })
  level: string;

  @Column('timestamp without time zone', { name: 'until', nullable: true })
  until: Date;

  @Column('timestamp without time zone', { name: 'from', nullable: true })
  from: Date;

  @PrimaryColumn('integer', { name: 'id' })
  id: number;

  @Column('character varying', { name: 'reason', nullable: true })
  reason: string;

  @Column('character varying', { name: 'operator', nullable: true })
  operator: string;
}
