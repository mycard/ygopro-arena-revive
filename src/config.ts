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
}

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
};
