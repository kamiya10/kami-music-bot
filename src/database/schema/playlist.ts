import { text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { createTable } from '../utils';
import { resourceTable } from './resource';

export const playlistTable = createTable('playlist', {
  id: varchar('id').unique().primaryKey(),
  resources: text('resources').references(() => resourceTable.id).array().notNull(),
  ownerId: varchar('owner_id').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdateFn(() => new Date(Date.now())),
});
