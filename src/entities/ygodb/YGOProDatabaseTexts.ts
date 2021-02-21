import { Column, Entity, OneToOne } from 'typeorm';
import { YGOProDatabaseDatas } from './YGOProDatabaseDatas';
import { JoinColumn } from 'typeorm';

@Entity('texts')
export class YGOProDatabaseTexts {
  @Column('integer', { primary: true, name: 'id' })
  id: number;

  @OneToOne((type) => YGOProDatabaseDatas, (datas) => datas.texts)
  @JoinColumn({ name: 'id', referencedColumnName: 'id' })
  datas: YGOProDatabaseDatas;

  @Column('text', { name: 'name', nullable: true })
  name: string | null;

  @Column('text', { name: 'desc', nullable: true })
  desc: string | null;

  @Column('text', { name: 'str1', nullable: true })
  str1: string | null;

  @Column('text', { name: 'str2', nullable: true })
  str2: string | null;

  @Column('text', { name: 'str3', nullable: true })
  str3: string | null;

  @Column('text', { name: 'str4', nullable: true })
  str4: string | null;

  @Column('text', { name: 'str5', nullable: true })
  str5: string | null;

  @Column('text', { name: 'str6', nullable: true })
  str6: string | null;

  @Column('text', { name: 'str7', nullable: true })
  str7: string | null;

  @Column('text', { name: 'str8', nullable: true })
  str8: string | null;

  @Column('text', { name: 'str9', nullable: true })
  str9: string | null;

  @Column('text', { name: 'str10', nullable: true })
  str10: string | null;

  @Column('text', { name: 'str11', nullable: true })
  str11: string | null;

  @Column('text', { name: 'str12', nullable: true })
  str12: string | null;

  @Column('text', { name: 'str13', nullable: true })
  str13: string | null;

  @Column('text', { name: 'str14', nullable: true })
  str14: string | null;

  @Column('text', { name: 'str15', nullable: true })
  str15: string | null;

  @Column('text', { name: 'str16', nullable: true })
  str16: string | null;
}
