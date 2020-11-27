import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('player_cards_name_position_pk', ['name', 'position'], { unique: true })
@Entity('player_cards', { schema: 'public' })
export class PlayerCards {
  @Column('character varying', { primary: true, name: 'name' })
  name: string;

  @PrimaryGeneratedColumn({ type: 'integer', name: 'position' })
  position: number;

  @Column('integer', { name: 'card1', nullable: true })
  card1: number;

  @Column('integer', { name: 'card2', nullable: true })
  card2: number;

  @Column('integer', { name: 'card3', nullable: true })
  card3: number;

  @Column('integer', { name: 'card4', nullable: true })
  card4: number;

  @Column('integer', { name: 'card5', nullable: true })
  card5: number;

  @Column('integer', { name: 'card6', nullable: true })
  card6: number;

  @Column('integer', { name: 'card7', nullable: true })
  card7: number;

  @Column('integer', { name: 'card8', nullable: true })
  card8: number;

  @Column('integer', { name: 'card9', nullable: true })
  card9: number;

  @Column('integer', { name: 'card10', nullable: true })
  card10: number;
}
