import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectEntityManager } from '@nestjs/typeorm';
import { Connection, EntityManager, LessThan, MoreThanOrEqual } from 'typeorm';
import bunyan, { createLogger } from 'bunyan';
import { UserInfo } from './entities/mycard/UserInfo';
import * as Filter from 'bad-words-chinese';
import { ChineseDirtyWords } from './dirtyWordsChinese';
import { YGOProDatabaseDatas } from './entities/ygodb/YGOProDatabaseDatas';
import { YGOProDatabaseTexts } from './entities/ygodb/YGOProDatabaseTexts';
import { getStringValueByMysticalNumber } from './CardInfo';
import * as moment from 'moment';
import { BattleHistory } from './entities/mycard/BattleHistory';
import _ from 'underscore';
import { SiteConfig } from './entities/mycard/SiteConfig';
import { AppLogger } from './app.logger';

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
}
