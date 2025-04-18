import { text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { createTable } from '../utils';
import { resource } from './resource';

export const playlist = createTable('playlist', {
  id: varchar('id').unique().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  resources: text('resources').references(() => resource.id).array().notNull(),
  ownerId: varchar('owner_id').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date(Date.now())),
});
