import { integer, text } from 'drizzle-orm/pg-core';

import { Platform } from '@/core/resource';

import { createTable } from '../utils';

export const resource = createTable('resource', {
  resourceId: text('resource_id').primaryKey().unique(),
  id: text('id').notNull(),
  type: text('platform', { enum: [Platform.SoundCloud, Platform.YouTube, Platform.File] }).notNull(),
  title: text('title').notNull(),
  length: integer('length'),
  url: text('url').notNull(),
  thumbnail: text('thumbnail').notNull(),
});
