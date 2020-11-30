import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectEntityManager } from '@nestjs/typeorm';
import { Connection, EntityManager } from 'typeorm';
import bunyan, { createLogger } from 'bunyan';
import { UserInfo } from './entities/mycard/UserInfo';
import * as Filter from 'bad-words-chinese';
import { ChineseDirtyWords } from './dirtyWordsChinese';
import { YGOProDatabaseDatas } from './entities/ygodb/YGOProDatabaseDatas';
import { YGOProDatabaseTexts } from './entities/ygodb/YGOProDatabaseTexts';
import { getStringValueByMysticalNumber } from './CardInfo';

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
  log: bunyan;
  chineseDirtyFilter: Filter;
  constructor(
    @InjectConnection('ygoproChinese')
    private cndb: Connection,
    @InjectConnection('ygoproEnglish')
    private endb: Connection,
    @InjectConnection('mycard')
    private mcdb: Connection,
  ) {
    this.log = createLogger({ name: 'ygopro-arena-revive' });
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
}
