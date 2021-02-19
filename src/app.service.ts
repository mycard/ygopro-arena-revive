import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectEntityManager } from '@nestjs/typeorm';
import { Connection, EntityManager, LessThan, MoreThanOrEqual } from 'typeorm';
import { UserInfo } from './entities/mycard/UserInfo';
import Filter from 'bad-words-chinese';
import { ChineseDirtyWords } from './dirtyWordsChinese';
import { YGOProDatabaseDatas } from './entities/ygodb/YGOProDatabaseDatas';
import { YGOProDatabaseTexts } from './entities/ygodb/YGOProDatabaseTexts';
import { getStringValueByMysticalNumber } from './CardInfo';
import moment from 'moment';
import { BattleHistory } from './entities/mycard/BattleHistory';
import _ from 'underscore';
import { SiteConfig } from './entities/mycard/SiteConfig';
import { AppLogger } from './app.logger';
import axios from 'axios';
import { config } from './config';
import qs from 'qs';
import { EloUtility } from './EloUtility';
import { Votes } from './entities/mycard/Votes';
import { VoteResult } from './entities/mycard/VoteResult';
import { promises as fs } from 'fs';

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
  ) {
    this.log.setContext('ygopro-arena-revive');
    this.chineseDirtyFilter = new Filter({
      chineseList: ChineseDirtyWords,
    });
    this.createUploadDirectory();
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

  async getUsersRaw(orderByPoints: boolean) {
    const repo = this.mcdb.getRepository(UserInfo);
    const orderByWhat = orderByPoints ? 'pt' : 'exp';
    return await repo
      .createQueryBuilder('userInfo')
      .orderBy(orderByWhat, 'DESC')
      .limit(100)
      .getRawMany();
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

      result.type = getStringValueByMysticalNumber(
        lang,
        typeOffset,
        cardDatas.type,
      );
      result.race = getStringValueByMysticalNumber(
        lang,
        raceOffset,
        cardDatas.race,
      );
      result.attribute = getStringValueByMysticalNumber(
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

  async getReport(inputFromTime: string, inputToTime: string) {
    const fromTime = (inputFromTime ? moment(inputFromTime) : moment()).format(
      'YYYY-MM-DD',
    );
    const toTime = (inputToTime
      ? moment(inputToTime)
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
          .andWhere('start_time >= :fromTime', { fromTime })
          .andWhere('start_time < :toTime', { toTime })
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(*)', 'entertainDisconnect')
          .from(BattleHistory, 'battleHistory')
          .where('type = :type', { type: 'entertain' })
          .andWhere('start_time >= :fromTime', { fromTime })
          .andWhere('start_time < :toTime', { toTime })
          .andWhere('(userscorea < 0 or userscoreb < 0)')
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(DISTINCT usernamea)', 'entertainUsers')
          .from(BattleHistory, 'battleHistory')
          .where('type = :type', { type: 'entertain' })
          .andWhere('start_time >= :fromTime', { fromTime })
          .andWhere('start_time < :toTime', { toTime })
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(*)', 'athleticTotal')
          .from(BattleHistory, 'battleHistory')
          .where('type = :type', { type: 'athletic' })
          .andWhere('start_time >= :fromTime', { fromTime })
          .andWhere('start_time < :toTime', { toTime })
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(*)', 'athleticDisconnect')
          .from(BattleHistory, 'battleHistory')
          .where('type = :type', { type: 'athletic' })
          .andWhere('start_time >= :fromTime', { fromTime })
          .andWhere('start_time < :toTime', { toTime })
          .andWhere('(userscorea < 0 or userscoreb < 0)')
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(DISTINCT usernamea)', 'athleticUsers')
          .from(BattleHistory, 'battleHistory')
          .where('type = :type', { type: 'athletic' })
          .andWhere('start_time >= :fromTime', { fromTime })
          .andWhere('start_time < :toTime', { toTime })
          .getRawOne(),
        this.mcdb.manager
          .createQueryBuilder()
          .select('count(DISTINCT usernamea)', 'totalActive')
          .from(BattleHistory, 'battleHistory')
          .andWhere('start_time >= :fromTime', { fromTime })
          .andWhere('start_time < :toTime', { toTime })
          .getRawOne(),
        this.mcdb.getRepository(BattleHistory).find({
          select: ['startTime'],
          where: {
            type: 'entertain',
            startTime: MoreThanOrEqual(fromTime),
            endTime: LessThan(toTime),
          },
        }),
        this.mcdb.getRepository(BattleHistory).find({
          select: ['startTime'],
          where: {
            type: 'athletic',
            startTime: MoreThanOrEqual(fromTime),
            endTime: LessThan(toTime),
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
        dateHour = moment(row.startTime).format('YYYY-MM-DD HH');
        h = moment(row.endTime).format('H');
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
        dateHour = moment(row.startTime).format('YYYY-MM-DD HH');
        h = moment(row.endTime).format('H');
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
      const totalDays = moment(toTime).diff(fromTime, 'days');

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
  private async getSiteConfig(configKey: string) {
    const configObject = await this.mcdb
      .getRepository(SiteConfig)
      .findOneOrFail({
        select: ['configValue'],
        where: [configKey],
      });
    return configObject.configValue;
  }
  private async updateSiteConfig(configKey: string, configValue: string) {
    await this.mcdb
      .getRepository(SiteConfig)
      .update({ configKey }, { configValue });
  }

  async updateActivity(body: any) {
    const { start, end, max, name } = body;
    const activityStr = JSON.stringify({ start, end, max, name });
    try {
      await this.updateSiteConfig('activity', activityStr);
      return { code: 200 };
    } catch (e) {
      this.log.warn(
        `Failed to update activity to ${activityStr}: ${e.toString()}`,
      );
      return { code: 500 };
    }
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
        console.log(tryFirstWin);
      }

      const ptResult = EloUtility.getEloScore(userA.pt, userB.pt, sa, sb);
      const expResult = EloUtility.getExpScore(
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
        ptResult.ptA = userA.pt;
        ptResult.ptB = userB.pt;
        if (userscoreA === -9) {
          ptResult.ptA = userA.pt - 2;
          this.log.compatLog(
            usernameA,
            '开局退房',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        } else if (userscoreB === -9) {
          ptResult.ptB = userB.pt - 2;
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
          ptResult.ptA = userA.pt + 8;
          ptResult.ptB = userB.pt - 8;
          this.log.compatLog(
            userA.pt,
            userB.pt,
            '当局分差过大,高分赢低分',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }

        if (winner === usernameB) {
          ptResult.ptA = userA.pt - 15;
          ptResult.ptB = userB.pt + 16;
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
          ptResult.ptA = userA.pt + 16;
          ptResult.ptB = userB.pt - 15;
          this.log.compatLog(
            userA.pt,
            userB.pt,
            '当局分差过大,低分赢高分',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }

        if (winner === usernameB) {
          ptResult.ptA = userA.pt - 8;
          ptResult.ptB = userB.pt + 8;
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
          ptResult.ptA = userA.pt;
          this.log.compatLog(
            usernameA,
            '当局有人存在早退，胜利不加分',
            moment(start).format('YYYY-MM-DD HH:mm'),
          );
        }
        if (winner === usernameB) {
          ptResult.ptB = userB.pt;
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
      battleHistory.expa = expResult.expA;
      battleHistory.expb = expResult.expB;
      battleHistory.expaEx = userA.exp;
      battleHistory.expbEx = userB.exp;
      battleHistory.pta = ptResult.ptA;
      battleHistory.ptb = ptResult.ptB;
      battleHistory.ptaEx = userA.pt;
      battleHistory.ptbEx = userB.pt;
      battleHistory.type = arena;
      battleHistory.startTime = moment(start).toDate();
      battleHistory.endTime = moment(end).toDate();
      battleHistory.winner = winner;
      battleHistory.isfirstwin = firstWin;
      battleHistory.decka = deckA;
      battleHistory.deckb = deckB;
      await Promise.all([
        repo.save(battleHistory),
        this.mcdb
          .createQueryBuilder()
          .update(UserInfo)
          .set({
            exp: expResult.expA,
            pt: ptResult.ptA,
            athleticWin: () => `athletic_win + ${paramA.athletic_win}`,
            athleticLose: () => `athletic_lose + ${paramA.athletic_win}`,
            athleticDraw: () => `athletic_draw + ${paramA.athletic_win}`,
            athleticAll: () => `athletic_all + ${paramA.athletic_win}`,
          })
          .where('username = :username', { username: userA.username })
          .execute(),
        this.mcdb
          .createQueryBuilder()
          .update(UserInfo)
          .set({
            exp: expResult.expB,
            pt: ptResult.ptB,
            athleticWin: () => `athletic_win + ${paramB.athletic_win}`,
            athleticLose: () => `athletic_lose + ${paramB.athletic_win}`,
            athleticDraw: () => `athletic_draw + ${paramB.athletic_win}`,
            athleticAll: () => `athletic_all + ${paramB.athletic_win}`,
          })
          .where('username = :username', { username: userB.username })
          .execute(),
      ]);
    } else {
      const expResult = EloUtility.getExpScore(
        userA.exp,
        userB.exp,
        userscoreA,
        userscoreB,
      );
      if (userscoreA > userscoreB) {
        paramA['entertain_win'] = 1;
        paramB['entertain_lose'] = 1;
        winner = usernameA;
      }
      if (userscoreA < userscoreB) {
        paramA['entertain_lose'] = 1;
        paramB['entertain_win'] = 1;
        winner = usernameB;
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
      battleHistory.expa = expResult.expA;
      battleHistory.expb = expResult.expB;
      battleHistory.expaEx = userA.exp;
      battleHistory.expbEx = userB.exp;
      battleHistory.pta = userA.pt;
      battleHistory.ptb = userA.pt;
      battleHistory.ptaEx = userA.pt;
      battleHistory.ptbEx = userB.pt;
      battleHistory.type = arena;
      battleHistory.startTime = moment(start).toDate();
      battleHistory.endTime = moment(end).toDate();
      battleHistory.winner = winner;
      battleHistory.isfirstwin = firstWin;
      battleHistory.decka = deckA;
      battleHistory.deckb = deckB;
      await Promise.all([
        repo.save(battleHistory),
        this.mcdb
          .createQueryBuilder()
          .update(UserInfo)
          .set({
            exp: expResult.expA,
            athleticWin: () => `athletic_win + ${paramA.athletic_win}`,
            athleticLose: () => `athletic_lose + ${paramA.athletic_win}`,
            athleticDraw: () => `athletic_draw + ${paramA.athletic_win}`,
            athleticAll: () => `athletic_all + ${paramA.athletic_win}`,
          })
          .where('username = :username', { username: userA.username })
          .execute(),
        this.mcdb
          .createQueryBuilder()
          .update(UserInfo)
          .set({
            exp: expResult.expB,
            athleticWin: () => `athletic_win + ${paramB.athletic_win}`,
            athleticLose: () => `athletic_lose + ${paramB.athletic_win}`,
            athleticDraw: () => `athletic_draw + ${paramB.athletic_win}`,
            athleticAll: () => `athletic_all + ${paramB.athletic_win}`,
          })
          .where('username = :username', { username: userB.username })
          .execute(),
      ]);
    }

    return null;
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
    vote.startTime = start_time;
    vote.endTime = end_time;
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

    const repo = this.mcdb.getRepository(VoteResult);
    try {
      if (multiple) {
        if (!opids) {
          return 400;
        }
        const voteResults = opids.map((opid) => {
          const voteResult = new VoteResult();
          voteResult.voteId = voteid;
          voteResult.optionId = opid;
          voteResult.userid = user;
          voteResult.dateTime = date_time;
          voteResult.createTime = create_time;
          return voteResult;
        });
        await Promise.all(
          voteResults.map((voteResult) => repo.save(voteResult)),
        );
      } else {
        const voteResult = new VoteResult();
        voteResult.voteId = voteid;
        voteResult.optionId = opid;
        voteResult.userid = user;
        voteResult.dateTime = date_time;
        voteResult.createTime = create_time;
        await repo.save(voteResult);
      }
      if (username) {
        await this.mcdb
          .getRepository(UserInfo)
          .update({ username }, { exp: () => 'exp + 1', id: parseInt(user) });
      }
      return 200;
    } catch (e) {
      this.log.error(`Failed updating vote result: ${e.toString()}`);
      return 500;
    }
  }

  private async fetchVoteOptionCount(
    voteId: number,
    optionId: number,
    optionCountMap,
  ) {
    const count = await this.mcdb.getRepository(VoteResult).count({
      voteId: voteId.toString(),
      optionId: optionId.toString(),
    });
    optionCountMap[optionId] = count;
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
    const voteCount: number = parseInt(voteCountResult.voteCount);
    voteCountMap[voteId] = voteCount;
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

    // page_no 当前页数 page_num 每页展示数
    // offset = (page_no - 1) * page_num
    // select * from battle_history limit  5 offset 15;
    const page_no: number = query.page || 1;
    const page_num: number = query.page_num || 15;
    const offset = (page_no - 1) * page_num;
    const repo = this.mcdb.getRepository(Votes);
    const countQuery = repo.createQueryBuilder();
    if (status !== undefined) {
      countQuery.where('status = :status', { status });
    }
    const total = await countQuery.getCount();
    const voteQuery = repo.createQueryBuilder();
    if (status !== undefined) {
      voteQuery.where('status = :status', { status });
    }
    voteQuery.orderBy('create_time', 'DESC').limit(page_num).offset(offset);
    const votes = await voteQuery.getMany();
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
}
