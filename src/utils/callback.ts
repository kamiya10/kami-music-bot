import { MessageFlags } from 'discord.js';

import Logger from './logger';

import type { CommandInteraction } from 'discord.js';

export const noop = () => { /* noop callback */ };

export const logError = (e: unknown) => {
  Logger.error(`Error`, e);
};

export const deferEphemeral = (interaction: CommandInteraction) => interaction.deferReply({
  flags: MessageFlags.Ephemeral,
});
