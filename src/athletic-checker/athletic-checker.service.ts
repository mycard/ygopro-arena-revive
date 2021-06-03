import { HttpService, Injectable } from '@nestjs/common';
import moment, { Moment } from 'moment';
import axios from 'axios';
import { athleticCheckConfig } from '../config';

interface AthleticDecksReturnData {
  name: string;
}

interface AthleticCheckReturnMessage {
  success: boolean;
  athletic?: boolean;
  message: string;
}

@Injectable()
export class AthleticCheckerService {
  athleticDeckCache: string[];
  lastAthleticDeckFetchTime: Moment;

  constructor(private readonly httpService: HttpService) {}

  private async getAthleticDecks(): Promise<string[]> {
    if (
      this.athleticDeckCache &&
      moment().diff(this.lastAthleticDeckFetchTime, 'seconds') <
        athleticCheckConfig.ttl
    ) {
      return this.athleticDeckCache;
    }
    const { data } = await this.httpService
      .get<AthleticDecksReturnData[]>(athleticCheckConfig.rankURL, {
        timeout: 10000,
        responseType: 'json',
        params: athleticCheckConfig.athleticFetchParams,
      })
      .toPromise();
    const athleticDecks = data
      .slice(0, athleticCheckConfig.rankCount)
      .map((m) => m.name);
    this.athleticDeckCache = athleticDecks;
    this.lastAthleticDeckFetchTime = moment();
    return athleticDecks;
  }

  async checkAthletic(deckType: string): Promise<AthleticCheckReturnMessage> {
    try {
      const athleticDecks = await this.getAthleticDecks();
      const athletic = athleticDecks.includes(deckType);
      return { success: true, athletic, message: null };
    } catch (e) {
      return { success: false, message: e.toString() };
    }
  }
}
