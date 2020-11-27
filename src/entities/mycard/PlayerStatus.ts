import { Column, Entity, Index } from 'typeorm';

@Index('player_status_pkey', ['name'], { unique: true })
@Entity('player_status', { schema: 'public' })
export class PlayerStatus {
  @Column('character varying', { primary: true, name: 'name' })
  name: string;

  @Column('integer', { name: 'status', nullable: true, default: 0 })
  status: number;

  @Column('integer', { name: 'position', nullable: true, default: 0 })
  position: number;

  @Column('character varying', { name: 'deck', nullable: true })
  deck: string;
}
