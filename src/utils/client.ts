import type { Client } from 'discord.js';

export const getCommandId = (name: string, client: Client) => {
  if (!client.application) return null;
  const id = client.application.commands.cache.findKey((c) => c.name === name);
  return id ?? null;
};
