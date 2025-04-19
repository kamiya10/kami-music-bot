import { ContextMenuCommandBuilder, MessageContextMenuCommandInteraction, UserContextMenuCommandInteraction } from 'discord.js';

import { KamiClient } from './client';

import type { Awaitable } from '@discordjs/util';

export interface KamiContextOptions {
  builder: ContextMenuCommandBuilder;
  onMessage?: (
    this: KamiClient,
    interaction: MessageContextMenuCommandInteraction<'cached'>
  ) => Awaitable<void>;
  onUser?: (
    this: KamiClient,
    interaction: UserContextMenuCommandInteraction<'cached'>
  ) => Awaitable<void>;
}

export class KamiContext {
  builder: ContextMenuCommandBuilder;

  onMessage?: (
    this: KamiClient,
    interaction: MessageContextMenuCommandInteraction<'cached'>
  ) => Awaitable<void>;

  onUser?: (
    this: KamiClient,
    interaction: UserContextMenuCommandInteraction<'cached'>
  ) => Awaitable<void>;

  constructor(options: KamiContextOptions) {
    this.builder = options.builder;
    this.onMessage = options.onMessage;
    this.onUser = options.onUser;
  }
}
