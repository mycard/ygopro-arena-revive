import { Column, Entity, Index } from 'typeorm';

@Index('safe_ak_pkey', ['id'], { unique: true })
@Entity('safe_ak', { schema: 'public' })
export class SafeAk {
  @Column('character varying', { name: 'ak', nullable: true, length: 255 })
  ak: string;

  @Column('character varying', { name: 'name', nullable: true, length: 255 })
  name: string;

  @Column('integer', { primary: true, name: 'id' })
  id: number;
}
