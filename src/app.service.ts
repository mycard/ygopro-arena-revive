import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectEntityManager } from '@nestjs/typeorm';
import {
  Brackets,
  Connection,
  EntityManager,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  SelectQueryBuilder,
  UpdateResult,
} from 'typeorm';
import { UserInfo } from './entities/mycard/UserInfo';
import Filter from 'bad-words-chinese';
import { ChineseDirtyWords } from './dirtyWordsChinese';
import { YGOProDatabaseDatas } from './entities/ygodb/YGOProDatabaseDatas';
import { YGOProDatabaseTexts } from './entities/ygodb/YGOProDatabaseTexts';
import moment from 'moment';
import { BattleHistory } from './entities/mycard/BattleHistory';
import _ from 'underscore';
import { SiteConfig } from './entities/mycard/SiteConfig';
import { AppLogger } from './app.logger';
import axios from 'axios';
import { config } from './config';
import qs from 'qs';
import { Votes } from './entities/mycard/Votes';
import { VoteResult } from './entities/mycard/VoteResult';
import { promises as fs } from 'fs';
import { scheduleJob } from 'node-schedule';
import { DeckInfo } from './entities/mycard/DeckInfo';
import { DeckInfoHistory } from './entities/mycard/DeckInfoHistory';
import { DeckDemo } from './entities/mycard/DeckDemo';
import { Ads } from './entities/mycard/Ads';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { DeckInfoOrHistory } from './entities/mycard/DeckInfoOrHistory';
import { EloService } from './elo/elo.service';
import { CardInfoService } from './card-info/card-info.service';
import { AthleticCheckerService } from './athletic-checker/athletic-checker.service';
import { HomePageMatchCountDto } from './dto/HomePageMatchCount.dto';
import { AccountService } from './account/account.service';
import { CodeResponseDto } from './dto/CodeResponse.dto';
import { PayExpDto } from './dto/PayExp.dto';
import { UserHistoricalRecord } from './entities/mycard/UserHistoricalRecord';

const attrOffset = 1010;
const raceOffset = 1020;
const typeOffset = 1050;

const ygoproConstants = {
  TYPES: {
    TYPE_MONSTER: 1,
    TYPE_SPELL: 2,
    TYPE_TRAP: 4,
    TYPE_NORMAL: 16,
    TYPE_EFFECT: 32,
    TYPE_FUSION: 64,
    TYPE_RITUAL: 128,
    TYPE_TRAPMONSTER: 256,
    TYPE_SPIRIT: 512,
    TYPE_UNION: 1024,
    TYPE_DUAL: 2048,
    TYPE_TUNER: 4096,
    TYPE_SYNCHRO: 8192,
    TYPE_TOKEN: 16384,
    TYPE_QUICKPLAY: 65536,
    TYPE_CONTINUOUS: 131072,
    TYPE_EQUIP: 262144,
    TYPE_FIELD: 524288,
    TYPE_COUNTER: 1048576,
    TYPE_FLIP: 2097152,
    TYPE_TOON: 4194304,
    TYPE_XYZ: 8388608,
    TYPE_PENDULUM: 16777216,
    TYPE_SPSUMMON: 33554432,
    TYPE_LINK: 67108864,
  },
  LINK_MARKERS: {
    LINK_MARKER_BOTTOM_LEFT: 1,
    LINK_MARKER_BOTTOM: 2,
    LINK_MARKER_BOTTOM_RIGHT: 4,
    LINK_MARKER_LEFT: 8,
    LINK_MARKER_RIGHT: 32,
    LINK_MARKER_TOP_LEFT: 64,
    LINK_MARKER_TOP: 128,
    LINK_MARKER_TOP_RIGHT: 256,
  },
};

interface PlayerDiff {
  athletic_win: number;
  athletic_lose: number;
  athletic_draw: number;
  athletic_all: number;
  entertain_win: number;
  entertain_lose: number;
  entertain_draw: number;
  entertain_all: number;
}

interface VoteOption {
  key: number;
  name: string;
  count: number;
  percentage: number;
}

export interface DeckInfoCard {
  id: number;
  num: number;
  name?: string;
  type?: string;
}

@Injectable()
export class AppService {
  chineseDirtyFilter: Filter;
  constructor(
    @InjectConnection('ygoproChinese')
    private cndb: Connection,
    @InjectConnection('ygoproEnglish')
    private endb: Connection,
    @InjectConnection('mycard')
    private mcdb: Connection,
    private log: AppLogger,
    private eloService: EloService,
    private cardInfoService: CardInfoService,
    private athleticCheckerService: AthleticCheckerService,
    private accountService: AccountService,
  ) {
    this.log.setContext('ygopro-arena-revive');
    this.chineseDirtyFilter = new Filter({
      chineseList: ChineseDirtyWords,
    });
    this.createUploadDirectory();
    if (config.enableSchedule) {
      scheduleJob('0 0 0 1 * *', async () => {
        await this.monthlyJob();
      });
    }
  }

  private async monthlyJob() {
    this.log.log(
      `The scheduleJob run on first day of every month: ${moment().format(
        'YYYY-MM-DD HH:mm',
      )}`,
    );
    const time = moment().subtract(1, 'month');
    const season = time.format('YYYY-MM');
    const higher_limit = time.format('YYYY-MM-01 00:00:01');
    const lower_limit = moment()
      .subtract(1, 'day')
      .format('YYYY-MM-DD 23:59:59');
    const base = 1000;
    const reset = [1, 4, 7, 10].indexOf(moment().month() + 1) >= 0;
    try {
      await this.mcdb.query(
        'select monthly_user_historical_record($1::text, $2, $3::boolean, true)',
        [season, base, reset],
      );
      await this.mcdb.query('select collect_win_lose_rate($1, $2)', [
        lower_limit,
        higher_limit,
      ]);
    } catch (e) {
      this.log.error(`Failed to run monthly job: ${e.toString()}`);
    }
  }

  private async createUploadDirectory() {
    try {
      await fs.access('./upload');
    } catch (e) {
      await fs.mkdir('./upload');
    }
  }

  private async transaction(
    db: Connection,
    fun: (mdb: EntityManager) => Promise<boolean>,
  ) {
    const runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    let result = false;
    try {
      result = await fun(runner.manager);
    } catch (e) {
      result = false;
      this.log.warn(`Failed running transaction: ${e.toString()}`);
    }
    if (result) {
      await runner.commitTransaction();
    } else {
      await runner.rollbackTransaction();
    }
    await runner.release();
  }

  async getUsers(orderByPoints: boolean) {
    const repo = this.mcdb.getRepository(UserInfo);
    const orderByWhat = orderByPoints ? 'pt' : 'exp';
    return await repo
      .createQueryBuilder('userInfo')
      .orderBy(orderByWhat, 'DESC')
      .limit(100)
      .getMany();
  }

  async getCardInfo(id: number, lang: string) {
    lang ||= 'cn';
    const db = (lang === 'cn' ? this.cndb : this.endb).manager;
    try {
      const cardDatas = await db.findOne(YGOProDatabaseDatas, id);
      const cardTexts = await db.findOne(YGOProDatabaseTexts, id);
      const result: any = {};
      result.id = id;
      result.name = cardTexts.name;
      result.desc = cardTexts.desc;
      result.str1 = cardTexts.str1;
      result.str2 = cardTexts.str2;
      result.str3 = cardTexts.str3;
      result.ot = cardDatas.ot;
      result.alias = cardDatas.alias;
      result.setcode = cardDatas.setcode;
      result.atk = cardDatas.atk;

      result.def = cardDatas.def;

      if (cardDatas.level <= 12) {
        result.level = cardDatas.level;
      } else {
        //转化为16位，0x01010004，前2位是左刻度，2-4是右刻度，末2位是等级
        const levelHex = cardDatas.level;
        const cardLevel = levelHex & 0xff;
        const cardLScale = (levelHex >> 6) & 0xff;
        const cardRScale = (levelHex >> 4) & 0xff;
        result.level = cardLevel;
        result.cardLScale = cardLScale;
        result.cardRScale = cardRScale;
      }

      if (!(cardDatas.type & ygoproConstants.TYPES.TYPE_LINK)) {
        result.name += ' ';
        result.name += ' ';
      } else {
        // result.name+="[LINK-" + cardLevel + "]";
        // result.name += " " + (result.atk < 0 ? "?" : result.atk) + "/- ";

        if (result.def & ygoproConstants.LINK_MARKERS.LINK_MARKER_TOP_LEFT)
          result.name += '[↖]';
        if (result.def & ygoproConstants.LINK_MARKERS.LINK_MARKER_TOP)
          result.name += '[↑]';
        if (result.def & ygoproConstants.LINK_MARKERS.LINK_MARKER_TOP_RIGHT)
          result.name += '[↗]';
        if (result.def & ygoproConstants.LINK_MARKERS.LINK_MARKER_LEFT)
          result.name += '[←]';
        if (result.def & ygoproConstants.LINK_MARKERS.LINK_MARKER_RIGHT)
          result.name += '[→]';
        if (result.def & ygoproConstants.LINK_MARKERS.LINK_MARKER_BOTTOM_LEFT)
          result.name += '[↙]';
        if (result.def & ygoproConstants.LINK_MARKERS.LINK_MARKER_BOTTOM)
          result.name += '[↓]';
        if (result.def & ygoproConstants.LINK_MARKERS.LINK_MARKER_BOTTOM_RIGHT)
          result.name += '[↘]';

        result.def = '-';
      }

      result.category = cardDatas.category;

      result.type = this.cardInfoService.getStringValueByMysticalNumber(
        lang,
        typeOffset,
        cardDatas.type,
      );
      result.race = this.cardInfoService.getStringValueByMysticalNumber(
        lang,
        raceOffset,
        cardDatas.race,
      );
      result.attribute = this.cardInfoService.getStringValueByMysticalNumber(
        lang,
        attrOffset,
        cardDatas.attribute,
      );
      return result;
    } catch (e) {
      this.log.warn(`Failed fetching card with id ${id}: ${e.toString()}`);
      return null;
    }
  }

  async getReport(inputFrom_time: string, inputTo_time: string) {
    const from_time = (inputFrom_time
      ? moment(inputFrom_time)
      : moment()
    ).format('YYYY-MM-DD');
    const to_time = (inputTo_time
      ? moment(inputTo_time)
      : moment().add(1, 'day')
    ).format('YYYY-MM-DD');
    try {
      const [
        { entertainTotal },
        { entertainDisconnect },
        { entertainUsers },
        { athleticTotal },
        { athleticDisconnect },
        { athleticUsers },
        { totalActive },
        hourlyEntertain,
        hourlyAthletic,
      ] = await Promise.all([
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(*)', 'entertainTotal')
          .from(BattleHistory, 'battleHistory')
          .where('type = :type', { type: 'entertain' })
          .andWhere('start_time >= :from_time', { from_time })
          .andWhere('start_time < :to_time', { to_time })
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(*)', 'entertainDisconnect')
          .from(BattleHistory, 'battleHistory')
          .where('type = :type', { type: 'entertain' })
          .andWhere('start_time >= :from_time', { from_time })
          .andWhere('start_time < :to_time', { to_time })
          .andWhere('(userscorea < 0 or userscoreb < 0)')
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(DISTINCT usernamea)', 'entertainUsers')
          .from(BattleHistory, 'battleHistory')
          .where('type = :type', { type: 'entertain' })
          .andWhere('start_time >= :from_time', { from_time })
          .andWhere('start_time < :to_time', { to_time })
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(*)', 'athleticTotal')
          .from(BattleHistory, 'battleHistory')
          .where('type = :type', { type: 'athletic' })
          .andWhere('start_time >= :from_time', { from_time })
          .andWhere('start_time < :to_time', { to_time })
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(*)', 'athleticDisconnect')
          .from(BattleHistory, 'battleHistory')
          .where('type = :type', { type: 'athletic' })
          .andWhere('start_time >= :from_time', { from_time })
          .andWhere('start_time < :to_time', { to_time })
          .andWhere('(userscorea < 0 or userscoreb < 0)')
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(DISTINCT usernamea)', 'athleticUsers')
          .from(BattleHistory, 'battleHistory')
          .where('type = :type', { type: 'athletic' })
          .andWhere('start_time >= :from_time', { from_time })
          .andWhere('start_time < :to_time', { to_time })
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(DISTINCT usernamea)', 'totalActive')
          .from(BattleHistory, 'battleHistory')
          .andWhere('start_time >= :from_time', { from_time })
          .andWhere('start_time < :to_time', { to_time })
          .getRawOne(),
        this.mcdb.getRepository(BattleHistory).find({
          select: ['start_time'],
          where: {
            type: 'entertain',
            start_time: MoreThanOrEqual(from_time),
            end_time: LessThan(to_time),
          },
        }),
        this.mcdb.getRepository(BattleHistory).find({
          select: ['start_time'],
          where: {
            type: 'athletic',
            start_time: MoreThanOrEqual(from_time),
            end_time: LessThan(to_time),
          },
        }),
      ]);

      let dateHour = '';
      let h = '';
      const hourlyDataMap = {
        athletic: {},
        entertain: {},
      };
      const hourlyAvgMapAthletic = {};
      const hourlyAvgMapEntertain = {};
      let totalAthletic = 0;
      let totalEntertain = 0;
      _.forEach(hourlyAthletic, function (row) {
        totalAthletic++;
        dateHour = moment(row.start_time).format('YYYY-MM-DD HH');
        h = moment(row.end_time).format('H');
        if (hourlyDataMap['athletic'][dateHour]) {
          hourlyDataMap['athletic'][dateHour]++;
        } else {
          hourlyDataMap['athletic'][dateHour] = 1;
        }

        if (hourlyAvgMapAthletic[h]) {
          hourlyAvgMapAthletic[h]++;
        } else {
          hourlyAvgMapAthletic[h] = 1;
        }
      });
      _.forEach(hourlyEntertain, function (row) {
        totalEntertain++;
        dateHour = moment(row.start_time).format('YYYY-MM-DD HH');
        h = moment(row.end_time).format('H');
        if (hourlyDataMap['entertain'][dateHour]) {
          hourlyDataMap['entertain'][dateHour]++;
        } else {
          hourlyDataMap['entertain'][dateHour] = 1;
        }

        if (hourlyAvgMapEntertain[h]) {
          hourlyAvgMapEntertain[h]++;
        } else {
          hourlyAvgMapEntertain[h] = 1;
        }
      });
      const totalDays = moment(to_time).diff(from_time, 'days');

      //饼图
      const legendDataAthletic = [];
      const seriesDataAthletic = [];
      for (let i = 0; i < 24; i++) {
        legendDataAthletic.push(i);
        seriesDataAthletic.push({
          name: i,
          avg: ((hourlyAvgMapAthletic[i] || 0) / totalDays).toFixed(2),
          value: hourlyAvgMapAthletic[i] || 0,
        });
      }

      const legendDataEntertain = [];
      const seriesDataEntertain = [];
      for (let i = 0; i < 24; i++) {
        legendDataEntertain.push(i);
        seriesDataEntertain.push({
          name: i,
          avg: ((hourlyAvgMapEntertain[i] || 0) / totalDays).toFixed(2),
          value: hourlyAvgMapEntertain[i] || 0,
        });
      }

      return {
        entertain: {
          total: entertainTotal,
          disconnect: entertainDisconnect,
          users: entertainUsers,
        },
        athletic: {
          total: athleticTotal,
          disconnect: athleticDisconnect,
          users: athleticUsers,
        },
        totalActive: totalActive,
        hourlyDataMap: hourlyDataMap,
        totalDays: totalDays,
        totalEntertain: totalEntertain,
        totalAthletic: totalAthletic,
        legendDataAthletic: legendDataAthletic,
        seriesDataAthletic: seriesDataAthletic,
        legendDataEntertain: legendDataEntertain,
        seriesDataEntertain: seriesDataEntertain,
      };
    } catch (e) {
      this.log.warn(`Failed to query report: ${e.toString()}`);
      return null;
    }
  }
  async getSiteConfig(configKey: string) {
    try {
      const configObject = await this.mcdb
        .getRepository(SiteConfig)
        .findOneOrFail({
          select: ['configValue'],
          where: { configKey },
        });
      return configObject.configValue;
    } catch (e) {
      this.log.warn(`Failed to get config ${configKey}: ${e.toString()}`);
      return null;
    }
  }
  async updateSiteConfig(configKey: string, configValue: string) {
    try {
      await this.mcdb
        .getRepository(SiteConfig)
        .update({ configKey }, { configValue });
      return 200;
    } catch (e) {
      this.log.warn(
        `Failed to update config ${configKey} to ${configValue}: ${e.toString()}`,
      );
      return 500;
    }
  }

  async updateActivity(body: any) {
    const { start, end, max, name } = body;
    const activityStr = JSON.stringify({ start, end, max, name });
    return this.updateSiteConfig('activity', activityStr);
  }

  private async findOrCreateUser(username: string) {
    const repo = this.mcdb.getRepository(UserInfo);
    let user = await repo.findOne({
      username,
    });
    if (!user) {
      user = new UserInfo();
      user.username = username;
      user = await repo.save(user);
    }
    return user;
  }

  private async checkDeckType(deck: string) {
    if (!deck) {
      return 'no deck';
    }
    try {
      const { data } = await axios.post(
        config.deckIdentifierPath,
        qs.stringify({ deck }),
        {
          responseType: 'json',
        },
      );
      const deckType = data.deck as string;
      return deckType;
    } catch (e) {
      this.log.warn(`Query deck failed for ${deck}: ${e.toString()}`);
      return 'deck fail';
    }
  }

  async postScore(body: any): Promise<string> {
    let usernameA: string = body.usernameA;
    let usernameB: string = body.usernameB;
    const userscoreA = parseInt(body.userscoreA) || 0;
    const userscoreB = parseInt(body.userscoreB) || 0;
    const start: string = body.start;
    const end: string = body.end;
    const arena: string = body.arena || 'entertain';
    if (userscoreA == -5 && userscoreB == -5) {
      return null;
    }
    if (!usernameA || !usernameB) {
      return 'username can not be null';
    }
    usernameA = usernameA.replace(/'/g, '');
    usernameB = usernameB.replace(/'/g, '');

    const [userA, userB, deckA, deckB] = await Promise.all([
      this.findOrCreateUser(usernameA),
      this.findOrCreateUser(usernameB),
      this.checkDeckType(body.userdeckA),
      this.checkDeckType(body.userdeckB),
    ]);

    const paramA: PlayerDiff = {
      athletic_win: 0,
      athletic_lose: 0,
      athletic_draw: 0,
      athletic_all: 1,
      entertain_win: 0,
      entertain_lose: 0,
      entertain_draw: 0,
      entertain_all: 1,
    };

    const paramB: PlayerDiff = {
      athletic_win: 0,
      athletic_lose: 0,
      athletic_draw: 0,
      athletic_all: 1,
      entertain_win: 0,
      entertain_lose: 0,
      entertain_draw: 0,
      entertain_all: 1,
    };
    let winner = 'none';
    let firstWin = false;

    // athletic = 竞技  entertain = 娱乐
    const repo = this.mcdb.getRepository(BattleHistory);
    let returnMessage: string = null;
    if (arena === 'athletic') {
      // select count(*) from battle_history where (usernameA = '爱吉' OR usernameB = '爱吉') and start_time > date '2017-02-09'
      // 日首胜  每日0点开始计算  日首胜的话是额外增加固定4DP

      const today = moment(moment(start).format('YYYY-MM-DD')).toDate();

      // 真实得分 S（胜=1分，和=0.5分，负=0分）
      let sa = 0,
        sb = 0;
      paramA['athletic_all'] = 1;
      paramB['athletic_all'] = 1;
      if (userscoreA > userscoreB || userscoreB === -9) {
        sa = 1;
        paramA['athletic_win'] = 1;
        paramB['athletic_lose'] = 1;
        winner = usernameA;
      } else if (userscoreA < userscoreB || userscoreA === -9) {
        sb = 1;
        paramA['athletic_lose'] = 1;
        paramB['athletic_win'] = 1;
        winner = usernameB;
      } else {
        sa = 0.5;
        sb = 0.5;
        paramA['athletic_draw'] = 1;
        paramB['athletic_draw'] = 1;
      }

      // 检查首胜
      if (winner !== 'none') {
        const tryFirstWin = await repo
          .createQueryBuilder('battleHistory')
          .where(
            "type ='athletic' and userscorea != -5 and userscoreb != -5 and ( (usernameA= :winner AND userscorea > userscoreb ) OR (usernameB= :winner AND userscoreb > userscorea) ) and start_time > :today",
            { winner, today },
          )
          .getOne();
        if (!tryFirstWin) {
          firstWin = true;
        }
      }

      const ptResult = this.eloService.getEloScore(userA.pt, userB.pt, sa, sb);
      const expResult = this.eloService.getExpScore(
        userA.exp,
        userB.exp,
        userscoreA,
        userscoreB,
      );

      // 处理开局退房的情况
      let pre_exit = false;
      if (userscoreA === -5 || userscoreB === -5) {
        pre_exit = true;
        firstWin = false;
        ptResult.ptA = 0;
        ptResult.ptB = 0;
        if (userscoreA === -9) {
          ptResult.ptA = -2;
          this.log.compatLog(
            usernameA,
            '开局退房',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        } else if (userscoreB === -9) {
          ptResult.ptB = -2;
          this.log.compatLog(
            usernameB,
            '开局退房',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }
      }

      //新增记分规则，双方DP差距超过137的话，
      //按加减8或16处理：高分赢低分 高分加8低分减8，低分赢高分，低分加16，高分减16.
      if (!pre_exit && userA.pt - userB.pt > 137) {
        if (winner === usernameA) {
          ptResult.ptA = +8;
          ptResult.ptB = -8;
          this.log.compatLog(
            userA.pt,
            userB.pt,
            '当局分差过大,高分赢低分',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }

        if (winner === usernameB) {
          ptResult.ptA = -15;
          ptResult.ptB = +16;
          this.log.compatLog(
            userA.pt,
            userB.pt,
            '当局分差过大,低分赢高分',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }
      }

      if (!pre_exit && userB.pt - userA.pt > 137) {
        if (winner === usernameA) {
          ptResult.ptA = +16;
          ptResult.ptB = -15;
          this.log.compatLog(
            userA.pt,
            userB.pt,
            '当局分差过大,低分赢高分',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }

        if (winner === usernameB) {
          ptResult.ptA = -8;
          ptResult.ptB = +8;
          this.log.compatLog(
            userA.pt,
            userB.pt,
            '当局分差过大,高分赢低分',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }
      }

      // 3分钟以内结束的决斗，胜者不加DP，负者照常扣DP。 平局不扣DP不加DP   : 把开始时间+3分钟，如果加完比结束时间靠后，说明比赛时间不足三分钟
      const isLess3Min = moment(start).add(1, 'm').isAfter(moment(end));
      if (!pre_exit && isLess3Min) {
        if (winner === usernameA) {
          ptResult.ptA = 0;
          this.log.compatLog(
            usernameA,
            '当局有人存在早退，胜利不加分',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }
        if (winner === usernameB) {
          ptResult.ptB = 0;
          this.log.compatLog(
            usernameB,
            '当局有人存在早退，胜利不加分',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }
      }

      // 2018.4.23 0秒的决斗，双方都不扣分 -- 星光
      // let sametime = start == end
      // if (sametime) {
      //     ptResult.ptA = userA.pt;
      //     ptResult.ptB = userB.pt;
      //     this.log.compatLog(usernameA, usernameB, '当局有人决斗时间一样 0s 双方不加分不扣分。', moment(start).format('YYYY-MM-DD HH:mm'))
      // }

      if (firstWin) {
        if (winner === usernameA) {
          ptResult.ptA += 5;
          this.log.compatLog(
            usernameA,
            '首胜多加5DP',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }
        if (winner === usernameB) {
          ptResult.ptB += 5;
          this.log.compatLog(
            usernameB,
            '首胜多加5DP',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }
      }

      const battleHistory = new BattleHistory();
      battleHistory.usernamea = userA.username;
      battleHistory.usernameb = userB.username;
      battleHistory.userscorea = userscoreA;
      battleHistory.userscoreb = userscoreB;
      battleHistory.expa = expResult.expA + userA.exp;
      battleHistory.expb = expResult.expB + userB.exp;
      battleHistory.expa_ex = userA.exp;
      battleHistory.expb_ex = userB.exp;
      battleHistory.pta = ptResult.ptA + userA.pt;
      battleHistory.ptb = ptResult.ptB + userB.pt;
      battleHistory.pta_ex = userA.pt;
      battleHistory.ptb_ex = userB.pt;
      battleHistory.type = arena;
      battleHistory.start_time = moment(start).toDate();
      battleHistory.end_time = moment(end).toDate();
      battleHistory.winner = winner;
      battleHistory.isfirstwin = firstWin;
      battleHistory.decka = deckA;
      battleHistory.deckb = deckB;
      // 高分赛，懒得弄Analytics于是塞这了
      if (config.analyzerHost && userA.pt >= 1400 && userB.pt >= 1400) {
        this.log.log(
          `Elite match ${usernameA} ${userA.pt} ${userscoreA} vs ${usernameB} ${userB.pt} ${userscoreB}`,
        );
        try {
          await axios.post(
            config.analyzerHost,
            qs.stringify({
              usernameA: usernameA,
              usernameB: usernameB,
              userscoreA: userscoreA,
              userscoreB: userscoreB,
              userdeckA: body.userdeckA,
              userdeckB: body.userdeckB,
              first: body.first,
              arena: 'athletic-elite',
            }),
          );
        } catch (e) {
          this.log.error(
            `Failed to send elite match ${usernameA} ${
              userA.pt
            } ${userscoreA} vs ${usernameB} ${
              userB.pt
            } ${userscoreB} to analytics: ${e.toString()}`,
          );
        }
      }
      await this.transaction(this.mcdb, async (db) => {
        const repo = db.getRepository(BattleHistory);
        try {
          await Promise.all([
            repo.save(battleHistory),
            db
              .createQueryBuilder()
              .update(UserInfo)
              .set({
                exp: () =>
                  `exp ${this.eloService.getSqlString(expResult.expA)}`,
                pt: () => `pt ${this.eloService.getSqlString(ptResult.ptA)}`,
                athletic_win: () => `athletic_win + ${paramA.athletic_win}`,
                athletic_lose: () => `athletic_lose + ${paramA.athletic_lose}`,
                athletic_draw: () => `athletic_draw + ${paramA.athletic_draw}`,
                athletic_all: () => `athletic_all + ${paramA.athletic_all}`,
              })
              .where('username = :username', { username: userA.username })
              .execute(),
            db
              .createQueryBuilder()
              .update(UserInfo)
              .set({
                exp: () =>
                  `exp ${this.eloService.getSqlString(expResult.expB)}`,
                pt: () => `pt ${this.eloService.getSqlString(ptResult.ptB)}`,
                athletic_win: () => `athletic_win + ${paramB.athletic_win}`,
                athletic_lose: () => `athletic_lose + ${paramB.athletic_lose}`,
                athletic_draw: () => `athletic_draw + ${paramB.athletic_draw}`,
                athletic_all: () => `athletic_all + ${paramB.athletic_all}`,
              })
              .where('username = :username', { username: userB.username })
              .execute(),
          ]);
          return true;
        } catch (e) {
          this.log.error(`Failed to report score: ${e.toString()}`);
          returnMessage = 'Failed to report score';
          return false;
        }
      });
    } else {
      const [isAthleticA, isAthleticB] = await Promise.all([
        this.athleticCheckerService.checkAthletic(deckA),
        this.athleticCheckerService.checkAthletic(deckB),
      ]);
      //this.log.error(deckA);
      //this.log.error(isAthleticA);
      let athleticResultOk = true;
      for (const result of [isAthleticA, isAthleticB]) {
        if (!result.success) {
          athleticResultOk = false;
          this.log.error(`Failed to get athletic result: ${result.message}`);
        }
      }
      const expResult = this.eloService.getExpScore(
        userA.exp,
        userB.exp,
        userscoreA,
        userscoreB,
      );
      let noRecord = false;
      if (userscoreA > userscoreB) {
        winner = usernameA;
        if (athleticResultOk && isAthleticA.athletic && !isAthleticB.athletic) {
          this.log.log(
            `Will not record this match because ${usernameA}'s ${deckA} is competitive while ${usernameB}'s ${deckB} isn't.`,
          );
          noRecord = true;
          paramA['entertain_all'] = 0;
          paramB['entertain_all'] = 0;
        } else {
          paramA['entertain_win'] = 1;
          paramB['entertain_lose'] = 1;
        }
      }
      if (userscoreA < userscoreB) {
        winner = usernameB;
        if (athleticResultOk && isAthleticB.athletic && !isAthleticA.athletic) {
          this.log.log(
            `Will not record this match because ${usernameB}'s ${deckB} is competitive while ${usernameA}'s ${deckA} isn't.`,
          );
          noRecord = true;
          paramA['entertain_all'] = 0;
          paramB['entertain_all'] = 0;
        } else {
          paramA['entertain_lose'] = 1;
          paramB['entertain_win'] = 1;
        }
      }
      if (userscoreA === userscoreB) {
        paramA['entertain_draw'] = 1;
        paramB['entertain_draw'] = 1;
      }
      const battleHistory = new BattleHistory();
      battleHistory.usernamea = userA.username;
      battleHistory.usernameb = userB.username;
      battleHistory.userscorea = userscoreA;
      battleHistory.userscoreb = userscoreB;
      battleHistory.expa = expResult.expA + userA.exp;
      battleHistory.expb = expResult.expB + userB.exp;
      battleHistory.expa_ex = userA.exp;
      battleHistory.expb_ex = userB.exp;
      battleHistory.pta = userA.pt;
      battleHistory.ptb = userB.pt;
      battleHistory.pta_ex = userA.pt;
      battleHistory.ptb_ex = userB.pt;
      battleHistory.type = arena;
      battleHistory.start_time = moment(start).toDate();
      battleHistory.end_time = moment(end).toDate();
      battleHistory.winner = winner;
      battleHistory.isfirstwin = firstWin;
      battleHistory.decka = deckA;
      battleHistory.deckb = deckB;
      await this.transaction(this.mcdb, async (db) => {
        const repo = db.getRepository(BattleHistory);
        try {
          if (!noRecord) {
            await repo.save(battleHistory);
          }
          await Promise.all([
            db
              .createQueryBuilder()
              .update(UserInfo)
              .set({
                exp: () =>
                  `exp ${this.eloService.getSqlString(expResult.expA)}`,
                entertain_win: () => `entertain_win + ${paramA.entertain_win}`,
                entertain_lose: () =>
                  `entertain_lose + ${paramA.entertain_lose}`,
                entertain_draw: () =>
                  `entertain_draw + ${paramA.entertain_draw}`,
                entertain_all: () => `entertain_all + ${paramA.entertain_all}`,
              })
              .where('username = :username', { username: userA.username })
              .execute(),
            db
              .createQueryBuilder()
              .update(UserInfo)
              .set({
                exp: () =>
                  `exp ${this.eloService.getSqlString(expResult.expB)}`,
                entertain_win: () => `entertain_win + ${paramB.entertain_win}`,
                entertain_lose: () =>
                  `entertain_lose + ${paramB.entertain_lose}`,
                entertain_draw: () =>
                  `entertain_draw + ${paramB.entertain_draw}`,
                entertain_all: () => `entertain_all + ${paramB.entertain_all}`,
              })
              .where('username = :username', { username: userB.username })
              .execute(),
          ]);
          return true;
        } catch (e) {
          this.log.error(`Failed to report score: ${e.toString()}`);
          returnMessage = 'Failed to report score';
          return false;
        }
      });
    }

    return returnMessage;
  }

  async updateVotes(body: any) {
    const id = parseInt(body.id) || null;
    const title = body.title as string;
    const options = body.options as string;
    const start_time = moment(body.start_time).toDate();
    const end_time = moment(body.end_time).toDate();
    const status = !!body.status || false;
    const multiple = !!body.multiple || false;
    const max = body.max ? parseInt(body.max) : 2;

    const now = moment().toDate();

    const repo = this.mcdb.getRepository(Votes);
    let vote;
    if (id) {
      vote = await repo.findOne({
        id,
      });
    }
    if (!vote) {
      vote = new Votes();
    }
    vote.title = title;
    vote.options = options;
    vote.start_time = start_time;
    vote.end_time = end_time;
    vote.status = status;
    vote.multiple = multiple;
    vote.max = max;

    try {
      await repo.save(vote);
      return 200;
    } catch (e) {
      this.log.error(`Errored updating votes: ${e.toString()}`);
      return 500;
    }
  }

  async updateVoteStatus(body: any) {
    const id = parseInt(body.id) || null;
    const status = !!body.status;

    if (!id) {
      return 401;
    }
    const repo = this.mcdb.getRepository(Votes);
    try {
      const result = await repo.update({ id }, { status });
      return result.affected ? 200 : 404;
    } catch (e) {
      this.log.error(`Errored updating vote status for ${id}: ${e.toString()}`);
      return 500;
    }
  }

  async submitVote(body: any) {
    const user: string = body.user;
    const username: string = body.username;

    if (!user || !username || user == 'undefined' || username == 'undefined') {
      return 400;
    }

    const voteid: string = body.voteid;
    const opid: string = body.opid;

    const opids: string[] = body.opids;
    const multiple = body.multiple === 'true';

    const date_time = moment().format('YYYY-MM-DD');
    const create_time = moment().toDate();

    let statusCode = 200;
    await this.transaction(this.mcdb, async (db) => {
      const repo = db.getRepository(VoteResult);
      try {
        if (multiple) {
          if (!opids) {
            statusCode = 400;
            return false;
          }
          const voteResults = opids.map((opid) => {
            const voteResult = new VoteResult();
            voteResult.vote_id = voteid;
            voteResult.option_id = opid;
            voteResult.userid = user;
            voteResult.date_time = date_time;
            voteResult.create_time = create_time;
            return voteResult;
          });
          await repo.save(voteResults);
        } else {
          const voteResult = new VoteResult();
          voteResult.vote_id = voteid;
          voteResult.option_id = opid;
          voteResult.userid = user;
          voteResult.date_time = date_time;
          voteResult.create_time = create_time;
          await repo.save(voteResult);
        }
        if (username) {
          await db
            .getRepository(UserInfo)
            .update({ username }, { exp: () => 'exp + 1', id: parseInt(user) });
        }
        return true;
      } catch (e) {
        this.log.error(`Failed updating vote result: ${e.toString()}`);
        statusCode = 500;
        return false;
      }
    });
    return statusCode;
  }

  private async fetchVoteOptionCount(
    voteId: number,
    optionId: number,
    optionCountMap,
  ) {
    const count = await this.mcdb.getRepository(VoteResult).count({
      vote_id: voteId.toString(),
      option_id: optionId.toString(),
    });
    optionCountMap[optionId] = count.toString(); // why to string?
  }

  private async fetchVoteInfo(
    vote: Votes,
    optionCountMap: any,
    voteCountMap: any,
  ) {
    const repo = this.mcdb.getRepository(VoteResult);
    const voteId = vote.id;
    const options: VoteOption[] = JSON.parse(vote.options);
    await Promise.all(
      options.map((option) =>
        this.fetchVoteOptionCount(voteId, option.key, optionCountMap),
      ),
    );
    const optionIdStrings = options.map((option) => option.key.toString());
    const voteCountResult = await repo
      .createQueryBuilder()
      .select('count(DISTINCT userid)', 'voteCount')
      .where('vote_id = :voteId', { voteId: voteId.toString() })
      .andWhere('option_id in (:...optionIdStrings)', { optionIdStrings })
      .getRawOne();
    voteCountMap[voteId] = voteCountResult.voteCount;
  }

  private async queryPageAndTotal<T>(
    page_no: number,
    page_num: number,
    queryFunction: () => SelectQueryBuilder<T>,
  ) {
    // page_no 当前页数 page_num 每页展示数
    // offset = (page_no - 1) * page_num
    // select * from battle_history limit  5 offset 15;
    const offset = (page_no - 1) * page_num;
    const total = await queryFunction().getCount();
    const data = await queryFunction().limit(page_num).offset(offset).getMany();
    return { total, data };
  }

  async getVotes(query: any) {
    const username = query.username;
    const type = query.type;
    let status: boolean = undefined;
    if (type === '1') {
      status = true;
    }
    if (type === '2') {
      status = false;
    }

    const from_date = query.from_date;
    const to_date = query.to_date;

    const page_no: number = query.page || 1;
    const page_num: number = query.page_num || 15;
    const offset = (page_no - 1) * page_num;
    const repo = this.mcdb.getRepository(Votes);
    const { total, data: votes } = await this.queryPageAndTotal(
      page_no,
      page_num,
      () => {
        const voteQuery = repo.createQueryBuilder();
        if (status !== undefined) {
          voteQuery.where('status = :status', { status });
        }
        voteQuery.orderBy('create_time', 'DESC');
        return voteQuery;
      },
    );
    const optionCountMap: any = {};
    const voteCountMap: any = {};
    await Promise.all(
      votes.map((vote) =>
        this.fetchVoteInfo(vote, optionCountMap, voteCountMap),
      ),
    );
    return {
      total,
      data: votes,
      voteCountMap,
      optionCountMap,
    };
  }

  async getRandomVote(userid: string) {
    const now = moment().toDate();
    const allVotes = await this.mcdb.getRepository(Votes).find({
      status: true,
      start_time: LessThanOrEqual(now),
      end_time: MoreThanOrEqual(now),
    });
    const votedIds = (
      await this.mcdb.getRepository(VoteResult).find({
        select: ['vote_id'],
        where: {
          userid,
        },
      })
    ).map((voteResult) => parseInt(voteResult.vote_id));
    const validVotes = allVotes.filter((vote) => !votedIds.includes(vote.id));
    if (validVotes.length) {
      const index = Math.floor(Math.random() * validVotes.length);
      return {
        data: validVotes[index],
      };
    } else {
      return { data: 'null' };
    }
  }

  async getDeckInfo(query: any) {
    const name: string = query.name;
    const version = query.version;
    let deck: DeckInfoOrHistory;
    if (version) {
      deck = await this.mcdb
        .getRepository(DeckInfoHistory)
        .createQueryBuilder()
        .where('name = :name', { name })
        .andWhere('id = :id', { id: parseInt(version) })
        .orderBy('start_time', 'DESC')
        .getOne();
    } else {
      deck = await this.mcdb
        .getRepository(DeckInfo)
        .createQueryBuilder()
        .where('name like :name', { name: `%${name}%` })
        .orderBy('start_time', 'DESC')
        .getOne();
    }
    if (!deck) {
      throw new NotFoundException({
        code: 404,
        message: 'deck not found.',
      });
    }
    const resName = deck.name;
    const history = await this.mcdb
      .getRepository(DeckInfoHistory)
      .createQueryBuilder()
      .where('name = :name', { name: resName })
      .orderBy('start_time', 'DESC')
      .getMany();
    const demo = (
      await this.mcdb
        .getRepository(DeckDemo)
        .createQueryBuilder()
        .where('name = :name', { name: resName })
        .orderBy('create_time', 'DESC')
        .getMany()
    ).map((row) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      row.create_time = moment(row.create_time).format('YYYY-MM-DD');
      return row;
    });
    return {
      code: 200,
      demo,
      history,
      data: deck,
    };
  }

  private async fillCardInfo(item: DeckInfoCard) {
    const lang = 'cn';
    const id = item.id;
    const card = await this.cndb.getRepository(YGOProDatabaseDatas).findOne({
      where: { id },
      relations: ['texts'],
    });
    if (!card) {
      this.log.error(`Card ${item.id} not found in database.`);
      item.name = 'Not found in database';
      item.type = '怪兽';
      return;
    }
    item.name = card.texts.name;
    item.type = this.cardInfoService.getStringValueByMysticalNumber(
      lang,
      typeOffset,
      card.type,
    );
  }

  private async fillCardInfoBatch(arr: DeckInfoCard[]) {
    return await Promise.all(arr.map((item) => this.fillCardInfo(item)));
  }

  async getDeckData(filename: string) {
    const filepath = 'upload/' + filename;

    let contentsRaw: string;
    try {
      contentsRaw = await fs.readFile(filepath, 'utf8');
    } catch (e) {
      return null;
    }

    const contents = contentsRaw.split(/\r?\n/);

    const mainCardArr: DeckInfoCard[] = [];
    const extraCardArr: DeckInfoCard[] = [];
    const sideCardArr: DeckInfoCard[] = [];

    const masterCardArr: DeckInfoCard[] = [];
    const trapCardArr: DeckInfoCard[] = [];
    const spellCardArr: DeckInfoCard[] = [];

    const mainOriginal: number[] = [];
    const extraOriginal: number[] = [];
    const sideOriginal: number[] = [];

    let current = mainOriginal;

    _.each(contents, function (text) {
      if (text === '#main') {
        current = mainOriginal;
      }
      if (text === '#extra') {
        current = extraOriginal;
      }
      if (text === '!side') {
        current = sideOriginal;
      }

      if (text === '#main' || text === '#extra' || text === '!side') {
        return;
      }

      if (text.indexOf('created') !== -1) {
        return;
      }

      if (text.trim() === '') {
        return;
      }
      const parsedText = parseInt(text);
      if (isNaN(parsedText)) {
        return;
      }
      current.push(parsedText);
    });

    const main = _.countBy(mainOriginal, Math.floor);
    const extra = _.countBy(extraOriginal, Math.floor);
    const side = _.countBy(sideOriginal, Math.floor);

    _.each(main, function (value, key) {
      mainCardArr.push({
        id: parseInt(key),
        num: value,
      });
    });

    _.each(extra, function (value, key) {
      extraCardArr.push({
        id: parseInt(key),
        num: value,
      });
    });

    _.each(side, function (value, key) {
      sideCardArr.push({
        id: parseInt(key),
        num: value,
      });
    });
    await Promise.all(
      [mainCardArr, sideCardArr, extraCardArr].map((arr) =>
        this.fillCardInfoBatch(arr),
      ),
    );
    for (const item of mainCardArr) {
      if (item.type === '怪兽') {
        masterCardArr.push(item);
      } else if (item.type === '魔法') {
        spellCardArr.push(item);
      } else if (item.type === '陷阱') {
        trapCardArr.push(item);
      } else {
        masterCardArr.push(item);
      }
    }
    return {
      monster: masterCardArr,
      spells: spellCardArr,
      traps: trapCardArr,
      extra: extraCardArr,
      side: sideCardArr,
    };
  }

  async submitDeckDemo(body: any) {
    const author: string = body.user;
    const title: string = body.title;
    const name: string = body.name;
    const img_url: string = body.url;
    const file: string = body.file || '';
    const now = moment().toDate();
    const deckDemo = new DeckDemo();
    deckDemo.author = author;
    deckDemo.title = title;
    deckDemo.url = img_url;
    deckDemo.name = name;
    deckDemo.file = file;
    deckDemo.create_time = now;
    try {
      await this.mcdb.getRepository(DeckDemo).save(deckDemo);
      return 200;
    } catch (e) {
      this.log.error(`Failed submitting deck demo: ${e.toString()}`);
      return 500;
    }
  }

  async submitDeckInfo(body: any) {
    const author = body.user;
    const title = body.title;
    const name = body.name;
    const desc = body.desc;
    const strategy = body.strategy;
    const reference = body.reference;
    const img_url = body.url;

    const isNew = body.isNew;

    const now = moment().toDate();

    const content = {
      author: this.chineseDirtyFilter.clean(author),
      title: this.chineseDirtyFilter.clean(title),
      desc: this.chineseDirtyFilter.clean(desc),
      strategy: this.chineseDirtyFilter.clean(strategy),
      reference: this.chineseDirtyFilter.clean(reference),
      url: img_url,
    };

    const contentStr = JSON.stringify(content);

    let code = 200;
    await this.transaction(this.mcdb, async (db) => {
      try {
        if (isNew === 'true') {
          const deckInfo = new DeckInfo();
          deckInfo.name = name;
          deckInfo.content = contentStr;
          deckInfo.start_time = now;
          await db.getRepository(DeckInfo).save(deckInfo);
        } else {
          await db
            .getRepository(DeckInfo)
            .update({ name }, { content: contentStr, end_time: now });
        }
        const deckInfoHistory = new DeckInfoHistory();
        deckInfoHistory.name = name;
        deckInfoHistory.content = contentStr;
        deckInfoHistory.start_time = now;
        this.log.log(
          await db.getRepository(DeckInfoHistory).save(deckInfoHistory),
        );
      } catch (e) {
        this.log.error(`Failed to submit deck info ${name}: ${e.toString()}`);
        code = 500;
        return false;
      }
      return true;
    });
    return code;
  }
  async getBattleHistory(query: any) {
    const username: string = query.username;
    const type = query.type;

    let arena: string = null; //1 athletic 2 entertain

    if (type === '1') {
      arena = 'athletic';
    }
    if (type === '2') {
      arena = 'entertain';
    }

    const from_date = query.from_date;
    const to_date = query.to_date;

    // page_no 当前页数 page_num 每页展示数
    // offset = (page_no - 1) * page_num
    // select * from battle_history limit  5 offset 15;
    const page_no: number = query.page || 1;
    const page_num: number = query.page_num || 15;
    const ret = await this.queryPageAndTotal(page_no, page_num, () => {
      const query = this.mcdb
        .getRepository(BattleHistory)
        .createQueryBuilder()
        .where('1 = 1');
      if (username) {
        query.andWhere(
          new Brackets((qb) => {
            qb.where('usernamea = :usernamea', {
              usernamea: username,
            }).orWhere('usernameb = :usernameb', {
              usernameb: username,
            });
          }),
        );
      }
      if (arena) {
        query.andWhere('type = :arena', { arena });
      }
      query.orderBy('start_time', 'DESC');
      return query;
    });
    for (const history of ret.data) {
      history.decka = null;
      history.deckb = null;
    }
    return ret;
  }
  async getScoreHistory(query: any): Promise<UserHistoricalRecord> {
    const username: string = query.username;
    const season: string = query.season;
    const q = this.mcdb
      .getRepository(UserHistoricalRecord)
      .createQueryBuilder()
      .where('username = :username and season = :season', {
        username: username,
        season: season,
      });
    const result = await q.getOne();
    return result;
  }
  async getUser(username: string) {
    const resultData = {
      exp: 0,
      pt: 1000,
      entertain_win: 0,
      entertain_lose: 0,
      entertain_draw: 0,
      entertain_all: 0,
      entertain_wl_ratio: '0',
      exp_rank: 0,
      athletic_win: 0,
      athletic_lose: 0,
      athletic_draw: 0,
      athletic_all: 0,
      athletic_wl_ratio: '0',
      arena_rank: 0,
    };
    if (!username) {
      return resultData;
    }
    const user = await this.mcdb.getRepository(UserInfo).findOne({
      where: { username },
    });
    if (!user) {
      return resultData;
    }
    resultData['exp'] = Math.floor(user['exp']);
    resultData['pt'] = Math.floor(user['pt']);

    resultData['entertain_win'] = user['entertain_win'];
    resultData['entertain_lose'] = user['entertain_lose'];
    resultData['entertain_draw'] = user['entertain_draw'];
    resultData['entertain_all'] = user['entertain_all'];

    let entertain_wl_ratio = '0';
    if (user['entertain_all'] > 0) {
      entertain_wl_ratio = (
        (user['entertain_win'] / user['entertain_all']) *
        100
      ).toFixed(2);
    }
    resultData['entertain_wl_ratio'] = entertain_wl_ratio;

    resultData['athletic_win'] = user['athletic_win'];
    resultData['athletic_lose'] = user['athletic_lose'];
    resultData['athletic_draw'] = user['athletic_draw'];
    resultData['athletic_all'] = user['athletic_all'];

    let athletic_wl_ratio = '0';
    if (user['athletic_all'] > 0) {
      athletic_wl_ratio = (
        (user['athletic_win'] / user['athletic_all']) *
        100
      ).toFixed(2);
    }
    resultData['athletic_wl_ratio'] = athletic_wl_ratio;
    const { arenaRank } = await this.mcdb.manager
      .createQueryBuilder()
      .select('count(*)', 'arenaRank')
      .from(UserInfo, 'tg')
      .addFrom(UserInfo, 'rk')
      .where('tg.username = :username', { username })
      .andWhere('rk.pt > tg.pt')
      .getRawOne();
    resultData.arena_rank = parseInt(arenaRank) + 1;
    const { expRank } = await this.mcdb.manager
      .createQueryBuilder()
      .select('count(*)', 'expRank')
      .from(UserInfo, 'tg')
      .addFrom(UserInfo, 'rk')
      .where('tg.username = :username', { username })
      .andWhere('rk.exp > tg.exp')
      .getRawOne();
    resultData.exp_rank = parseInt(expRank) + 1;
    return resultData;
  }
  async updateAds(body: any) {
    const id: number = body.id;
    const name: string = body.name;
    const desc: string = body.desc;
    const imgp: string = body.imgp;
    const imgm: string = body.imgm;
    const clkref: string = body.clkref;
    const implurl: string = body.implurl;
    const clkurl: string = body.clkurl;
    const status: boolean = body.status != null ? body.status === 'true' : true;
    const type = body.type || '1';

    const now = moment().toDate();

    let ads: Ads;
    const repo = this.mcdb.getRepository(Ads);

    if (id) {
      ads = await repo.findOne({ id });
      if (!ads) {
        return 404;
      }
    } else {
      ads = new Ads();
      ads.create_time = now;
    }
    ads.update_time = now;
    ads.name = name;
    ads.desctext = desc;
    ads.imgm_url = imgm;
    ads.imgp_url = imgp;
    ads.click_ref = clkref;
    ads.click_url = clkurl;
    ads.impl_url = implurl;
    ads.status = status;
    ads.type = type;

    try {
      await repo.save(ads);
    } catch (e) {
      this.log.error(`Failed to save ad ${name}: ${e.toString()}`);
      return 500;
    }

    return 200;
  }
  async getAds(query: any) {
    const username = query.username;
    const type = query.type;

    let status: boolean = undefined;
    if (type === '1') {
      status = true;
    }
    if (type === '2') {
      status = false;
    }

    const from_date = query.from_date;
    const to_date = query.to_date;

    // page_no 当前页数 page_num 每页展示数
    // offset = (page_no - 1) * page_num
    // select * from battle_history limit  5 offset 15;
    const page_no = query.page || 1;
    const page_num = query.page_num || 15;
    const ad_switch = (await this.getSiteConfig('auto_close_ad')) === 'true';
    return {
      ad_switch,
      ...(await this.queryPageAndTotal(page_no, page_num, () => {
        const query = this.mcdb.getRepository(Ads).createQueryBuilder();
        if (status !== undefined) {
          query.where('status = :status', { status });
        }
        query.orderBy('create_time', 'DESC');
        return query;
      })),
    };
  }
  async getRandomAd(typeInput: string) {
    const type = typeInput || '1';
    const repo = await this.mcdb.getRepository(Ads);
    const auto_close_ad = await this.getSiteConfig('auto_close_ad');
    const totalAdCount = await repo.count({ where: { status: true, type } });
    if (!totalAdCount) {
      return {
        data: 'null',
        auto_close_ad,
      };
    }
    const targetAd = await repo
      .createQueryBuilder()
      .where('status = true')
      .andWhere('type = :type', { type })
      .offset(Math.floor(Math.random() * totalAdCount))
      .limit(1)
      .getOne();
    return {
      data: targetAd,
      auto_close_ad,
    };
  }
  async updateAdsStatus(body: any) {
    const id: number = body.id;
    const status: boolean = body.status && body.status !== 'false';

    const now = moment().toDate();

    try {
      await this.mcdb.getRepository(Ads).update({ id }, { status });
      return 200;
    } catch (e) {
      this.log.error(
        `Failed to update ads status of ${id} to ${status}: ${e.toString()}`,
      );
      return 500;
    }
  }
  async increaseAds(id: number, field: string) {
    if (!id) {
      return 400;
    }
    const increaseStatement: QueryDeepPartialEntity<Ads> = {
      [field]: () => `${field} + 1`,
    };
    try {
      await this.mcdb.getRepository(Ads).update({ id }, increaseStatement);
      return 200;
    } catch (e) {
      this.log.error(
        `Failed to increase ads's ${field} of ${id}: ${e.toString()}`,
      );
      return 500;
    }
  }
  async getFirstWinActivity(username: string) {
    if (!username) {
      return {};
    }
    const activity: any = JSON.parse(await this.getSiteConfig('activity'));
    activity.total = (
      await this.mcdb
        .getRepository(BattleHistory)
        .createQueryBuilder()
        .where(
          "type ='athletic' and isfirstwin='t' and ( (usernameA = :username AND  userscorea > userscoreb ) OR (usernameB = :username AND userscoreb > userscorea) ) and start_time > :start  and start_time < :end",
          { username, start: activity.start, end: activity.end },
        )
        .getCount()
    ).toString();
    const today = moment().format('YYYY-MM-DD');
    activity.today = (
      await this.mcdb
        .getRepository(BattleHistory)
        .createQueryBuilder()
        .where(
          "type ='athletic' and isfirstwin='t' and ( (usernameA = :username AND  userscorea > userscoreb ) OR (usernameB = :username AND userscoreb > userscorea) ) and start_time > :start",
          { username, start: today },
        )
        .getCount()
    ).toString();
    return activity;
  }

  async getLastMonthBattleCount() {
    const lastMonth = moment().subtract(1, 'month');
    const fromTime = moment(lastMonth);
    fromTime.set({ date: 1, hour: 0, minute: 0, second: 0 });
    const toTime = moment(fromTime).add(1, 'month');
    //this.log.log(`${fromTime} - ${toTime}`);
    const count = await this.mcdb.getRepository(BattleHistory).count({
      where: {
        end_time: MoreThanOrEqual(fromTime.toDate()),
        start_time: LessThanOrEqual(toTime.toDate()),
      },
    });
    return new HomePageMatchCountDto(count);
  }

  async payExp(token: string, dto: PayExpDto) {
    const user = await this.accountService.checkToken(token);
    if (user.admin) {
      return new CodeResponseDto(200);
    }
    return this.mcdb.transaction(async (edb) => {
      const userInfo = await edb.getRepository(UserInfo).findOne({
        select: ['username', 'exp'],
        where: { username: user.username },
      });
      if (!userInfo) {
        this.log.log(
          `${user.username} has no duel records, cannot use ${dto.getName()}.`,
        );
        throw new HttpException(
          new CodeResponseDto(402, 'No duel records.'),
          402,
        );
      }
      if (userInfo.exp < dto.cost) {
        this.log.log(
          `${user.username} has no enough exp to use novelai: ${userInfo.exp}`,
        );
        throw new HttpException(
          new CodeResponseDto(402, 'Not enough exp.'),
          402,
        );
      }
      this.log.log(
        `${user.username} paid ${dto.cost} exp to use ${dto.getName()}.`,
      );
      await edb
        .getRepository(UserInfo)
        .decrement({ username: user.username }, 'exp', dto.cost);
      return new CodeResponseDto(200);
    });
  }
}
