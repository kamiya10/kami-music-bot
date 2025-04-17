import { boolean, real, smallint, text, varchar } from 'drizzle-orm/pg-core';

import { createTable } from '../utils';

export const preferenceTable = createTable('preference', {
  userId: varchar('user_id', { length: 20 }).primaryKey().unique(),
  name: text('name'),
  lock: boolean('lock'),
  volume: real('volume'),
  region: varchar('region', { enum: ['brazil', 'hongkong', 'india', 'japan', 'rotterdam', 'singapore', 'southafrica', 'sydney', 'us-central', 'us-east', 'us-south', 'us-west'] }),
  bitrate: smallint('bitrate'),
  nsfw: boolean('nsfw'),
  limit: smallint('limit'),
});
