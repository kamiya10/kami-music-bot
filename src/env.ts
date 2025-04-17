import 'dotenv/config';

import { type } from 'arktype';

const schema = type({
  NODE_ENV: '"development" | "production"',
  KAMI_TOKEN: 'string',
  DEV_TOKEN: 'string',
  YOUTUBE_TOKEN: 'string',
  LASTFM_TOKEN: 'string',
  LASTFM_SECRET: 'string',
  GENIUS_SECRET: 'string',
  DATABASE_URL: 'string',
  WEBHOOK_URL: 'string',
  BOT_VERSION: 'string',
  DEV_GUILD_ID: 'string',
  CACHE_FOLDER: 'string',
});

const result = schema({
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  KAMI_TOKEN: process.env['KAMI_TOKEN'],
  DEV_TOKEN: process.env['DEV_TOKEN'],
  YOUTUBE_TOKEN: process.env['YOUTUBE_TOKEN'],
  LASTFM_TOKEN: process.env['LASTFM_TOKEN'],
  LASTFM_SECRET: process.env['LASTFM_SECRET'],
  GENIUS_SECRET: process.env['GENIUS_SECRET'],
  DATABASE_URL: process.env['DATABASE_URL'],
  WEBHOOK_URL: process.env['WEBHOOK_URL'],
  BOT_VERSION: process.env['BOT_VERSION'],
  DEV_GUILD_ID: process.env['DEV_GUILD_ID'],
  CACHE_FOLDER: process.env['CACHE_FOLDER'] ?? '.cache',
});

if (result instanceof type.errors) {
  throw new Error(result.summary, { cause: result });
}

export const env = result;
