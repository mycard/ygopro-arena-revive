export interface Config {
  accessKey: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  deckIdentifierPath: string;
  analyzerHost: string;
  enableSchedule: boolean;
  accountsUrl: string;
}

export const athleticCheckConfig = {
  rankURL: 'https://api.mycard.moe/ygopro/analytics/deck/type',
  identifierURL: 'https://api.mycard.moe/ygopro/identifier/production',
  athleticFetchParams: {
    type: 'week',
    source: 'mycard-athletic',
  },
  rankCount: 20,
  ttl: 600,
};

export const config: Config = {
  accessKey: process.env.ARENA_ACCESS_KEY,
  host: process.env.PGHOST,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  username: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  deckIdentifierPath: process.env.DECK_IDENTIFIER_PATH,
  analyzerHost: process.env.ANALYZER_HOST,
  enableSchedule: !process.env.NO_SCHEDULE,
  accountsUrl:
    process.env.ACCOUNTS_URL || 'https://sapi.moecube.com:444/accounts',
};
