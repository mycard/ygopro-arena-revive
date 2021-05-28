import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { config } from './config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YGOProDatabaseDatas } from './entities/ygodb/YGOProDatabaseDatas';
import { YGOProDatabaseTexts } from './entities/ygodb/YGOProDatabaseTexts';
import { Ads } from './entities/mycard/Ads';
import { UnknownDecks } from './entities/mycard/UnknownDecks';
import { SingleDay } from './entities/mycard/SingleDay';
import { SingleMonth } from './entities/mycard/SingleMonth';
import { Count } from './entities/mycard/Count';
import { DeckInfo } from './entities/mycard/DeckInfo';
import { BhAccount } from './entities/mycard/BhAccount';
import { RatingIndex } from './entities/mycard/RatingIndex';
import { Counter } from './entities/mycard/Counter';
import { UserBanHistory } from './entities/mycard/UserBanHistory';
import { DeckDemo } from './entities/mycard/DeckDemo';
import { Matchup } from './entities/mycard/Matchup';
import { UserHistoricalRecord } from './entities/mycard/UserHistoricalRecord';
import { DeckHalfmonth } from './entities/mycard/DeckHalfmonth';
import { Votes } from './entities/mycard/Votes';
import { SingleSeason } from './entities/mycard/SingleSeason';
import { SafeAk } from './entities/mycard/SafeAk';
import { TagDay } from './entities/mycard/TagDay';
import { TagHalfmonth } from './entities/mycard/TagHalfmonth';
import { DeckMonth } from './entities/mycard/DeckMonth';
import { DeckInfoHistory } from './entities/mycard/DeckInfoHistory';
import { PlayerStatus } from './entities/mycard/PlayerStatus';
import { TagWeek } from './entities/mycard/TagWeek';
import { Deck } from './entities/mycard/Deck';
import { PlayerCards } from './entities/mycard/PlayerCards';
import { SiteConfig } from './entities/mycard/SiteConfig';
import { SingleHalfmonth } from './entities/mycard/SingleHalfmonth';
import { VoteResult } from './entities/mycard/VoteResult';
import { BattleHistory } from './entities/mycard/BattleHistory';
import { MessageHistory } from './entities/mycard/MessageHistory';
import { BhApply } from './entities/mycard/BhApply';
import { SingleWeek } from './entities/mycard/SingleWeek';
import { Single } from './entities/mycard/Single';
import { TagMonth } from './entities/mycard/TagMonth';
import { DeckDay } from './entities/mycard/DeckDay';
import { TagSeason } from './entities/mycard/TagSeason';
import { Tag } from './entities/mycard/Tag';
import { DeckSeason } from './entities/mycard/DeckSeason';
import { DeckWeek } from './entities/mycard/DeckWeek';
import { UserInfo } from './entities/mycard/UserInfo';
import { AppLogger } from './app.logger';
import { HttpResponseService } from './http-response/http-response.service';
import { EloService } from './elo/elo.service';
import { CardInfoService } from './card-info/card-info.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

const ygoproEntities = [YGOProDatabaseDatas, YGOProDatabaseTexts];
const mycardEntities = [
  Ads,
  BattleHistory,
  BhAccount,
  BhApply,
  Counter,
  Count,
  DeckDay,
  DeckDemo,
  DeckHalfmonth,
  DeckInfoHistory,
  DeckInfo,
  DeckMonth,
  DeckSeason,
  Deck,
  DeckWeek,
  Matchup,
  MessageHistory,
  PlayerCards,
  PlayerStatus,
  RatingIndex,
  SafeAk,
  SingleDay,
  SingleHalfmonth,
  SingleMonth,
  SingleSeason,
  Single,
  SingleWeek,
  SiteConfig,
  TagDay,
  TagHalfmonth,
  TagMonth,
  TagSeason,
  Tag,
  TagWeek,
  UnknownDecks,
  UserBanHistory,
  UserHistoricalRecord,
  UserInfo,
  VoteResult,
  Votes,
];

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'upload'),
      serveRoot: '/api/download',
    }),
    TypeOrmModule.forRoot({
      synchronize: false,
      type: 'sqlite',
      name: 'ygoproChinese',
      entities: ygoproEntities,
      database: './ygopro-database/locales/zh-CN/cards.cdb',
    }),
    TypeOrmModule.forRoot({
      synchronize: false,
      type: 'sqlite',
      name: 'ygoproEnglish',
      entities: ygoproEntities,
      database: './ygopro-database/locales/en-US/cards.cdb',
    }),
    TypeOrmModule.forRoot({
      synchronize: false,
      type: 'postgres',
      name: 'mycard',
      entities: mycardEntities,
      username: config.username,
      password: config.password,
      host: config.host,
      port: config.port,
      database: config.database,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppLogger,
    HttpResponseService,
    EloService,
    CardInfoService,
  ],
})
export class AppModule {}
