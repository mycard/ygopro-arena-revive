import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('user_info', { schema: 'public' })
export class UserInfo {
  @ApiProperty({ description: '用户名' })
  @PrimaryColumn('character varying', { name: 'username', length: 100 })
  username: string;

  @ApiProperty({ description: 'EXP 数值' })
  @Column('double precision', {
    name: 'exp',
    precision: 53,
    default: 0,
  })
  exp: number;

  @ApiProperty({ description: 'DP 数值' })
  @Column('double precision', {
    name: 'pt',
    precision: 53,
    default: 1000,
  })
  pt: number;

  @ApiProperty({ description: '娱乐匹配胜利数' })
  @Column('integer', { name: 'entertain_win', default: 0 })
  entertain_win: number;

  @ApiProperty({ description: '娱乐匹配失败数' })
  @Column('integer', { name: 'entertain_lose', default: 0 })
  entertain_lose: number;

  @ApiProperty({ description: '娱乐匹配平局数' })
  @Column('integer', { name: 'entertain_draw', default: 0 })
  entertain_draw: number;

  @ApiProperty({ description: '娱乐匹配总数' })
  @Column('integer', { name: 'entertain_all', default: 0 })
  entertain_all: number;

  @ApiProperty({ description: '竞技匹配胜利数' })
  @Column('integer', { name: 'athletic_win', default: 0 })
  athletic_win: number;

  @ApiProperty({ description: '竞技匹配失败数' })
  @Column('integer', { name: 'athletic_lose', default: 0 })
  athletic_lose: number;

  @ApiProperty({ description: '竞技匹配平局数' })
  @Column('integer', { name: 'athletic_draw', default: 0 })
  athletic_draw: number;

  @ApiProperty({ description: '竞技匹配总数' })
  @Column('integer', { name: 'athletic_all', default: 0 })
  athletic_all: number;

  @ApiProperty({ description: '玩家 ID' })
  @Column('integer', { name: 'id', nullable: true })
  id: number;
}
