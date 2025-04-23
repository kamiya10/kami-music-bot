import { env } from '@/env';

import type { Client } from 'discord.js';

export const getCommandId = (name: string, client: Client) => {
  if (!client.application) return null;
  const id = (env.NODE_ENV === 'development'
    ? client.guilds.cache.get(env.DEV_GUILD_ID)!.commands
    : client.application.commands)
    .cache.findKey((c) => c.name === name);
  return id ?? null;
};
