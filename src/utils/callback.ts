import { MessageFlags } from 'discord.js';

import Logger from './logger';

import type { ChatInputCommandInteraction } from 'discord.js';

export const logError = (e: unknown) => {
  Logger.error(`Error`, e);
};

export const deferEphemeral = (interaction: ChatInputCommandInteraction) => interaction.deferReply({
  flags: MessageFlags.Ephemeral,
});
