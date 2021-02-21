import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('unique_index', ['option_id', 'userid', 'vote_id'], { unique: true })
@Entity('vote_result', { schema: 'public' })
export class VoteResult {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'vote_id', unique: true, length: 100 })
  vote_id: string;

  @Column('character varying', { name: 'option_id', unique: true, length: 100 })
  option_id: string;

  @Column('character varying', { name: 'userid', unique: true, length: 100 })
  userid: string;

  @Column('character varying', { name: 'date_time', length: 100 })
  date_time: string;

  @Column('timestamp without time zone', {
    name: 'create_time',
    nullable: true,
  })
  create_time: Date;
}
