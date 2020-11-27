import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('site_config', { schema: 'public' })
export class SiteConfig {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id: number;

  @Column('character varying', { name: 'config_key', length: 100 })
  configKey: string;

  @Column('text', { name: 'config_value', nullable: true })
  configValue: string;
}
