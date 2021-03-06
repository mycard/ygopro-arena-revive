import { Column, Entity, OneToOne } from 'typeorm';
import { YGOProDatabaseTexts } from './YGOProDatabaseTexts';

@Entity('datas')
export class YGOProDatabaseDatas {
  @Column('integer', { primary: true, name: 'id' })
  id: number;

  @OneToOne((type) => YGOProDatabaseTexts, (texts) => texts.datas)
  texts: YGOProDatabaseTexts;

  @Column('integer', { name: 'ot', nullable: true })
  ot: number | null;

  @Column('integer', { name: 'alias', nullable: true })
  alias: number | null;

  @Column('integer', { name: 'setcode', nullable: true })
  setcode: number | null;

  @Column('integer', { name: 'type', nullable: true })
  type: number | null;

  @Column('integer', { name: 'atk', nullable: true })
  atk: number | null;

  @Column('integer', { name: 'def', nullable: true })
  def: number | null;

  @Column('integer', { name: 'level', nullable: true })
  level: number | null;

  @Column('integer', { name: 'race', nullable: true })
  race: number | null;

  @Column('integer', { name: 'attribute', nullable: true })
  attribute: number | null;

  @Column('integer', { name: 'category', nullable: true })
  category: number | null;
}
