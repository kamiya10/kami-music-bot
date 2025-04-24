import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

import { Client, Collection, GatewayIntentBits } from 'discord.js';

import Logger from '@/utils/logger';
import { ResourceResolver } from '@/services/resource';
import commands from '&';
import contextMenus from '$';
import { env } from '@/env';
import events from '#';
import pkg from '~/package.json';
import { safeWriteFileSync } from '@/utils/fs';

import type { ClientOptions } from 'discord.js';
import type { KamiCommand } from '@/core/command';
import type { KamiContext } from '@/core/context';
import type { KamiMusicPlayer } from '@/core/player';

export class KamiClient extends Client {
  cacheFolderPath = resolve(env.CACHE_FOLDER);
  commands = new Collection<string, KamiCommand>();
  contextMenus = new Collection<string, KamiContext>();
  players = new Collection<string, KamiMusicPlayer>();
  version = pkg.version;
  resourceResolver: ResourceResolver;

  constructor(options?: ClientOptions) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
      ],
      ...options,
    });

    mkdirSync(join(this.cacheFolderPath, 'audio'), { recursive: true });
    this.resourceResolver = new ResourceResolver(this);

    for (const command of commands) {
      this.commands.set(command.builder.name, command);
    }
    Logger.info(`Loaded ${this.commands.size} commands`);
    Logger.debug(this.commands.map((c) => `/${c.builder.name}`).join(', '));

    for (const contextMenu of contextMenus) {
      this.contextMenus.set(contextMenu.builder.name, contextMenu);
    }
    Logger.info(`Loaded ${this.contextMenus.size} context menus`);
    Logger.debug(this.contextMenus.map((c) => `/${c.builder.name}`).join(', '));

    for (const event of events) {
      const on = event.on;
      if (on) {
        this.on(event.event, (...args) => void on.apply(this, args));
      }
      const once = event.once;
      if (once) {
        this.once(event.event, (...args) => void once.apply(this, args));
      }
    }
    Logger.info(`Loaded ${events.length} event handlers`);
  }

  async resolveResource(url: string) {
    return this.resourceResolver.resolve(url);
  }

  async updateApplicationCommands(force = false) {
    if (!this.isReady()) {
      Logger.error('Client isn\'t ready for command updates yet');
      return;
    }

    try {
      // Combine both slash commands and context menu commands
      const data = [
        ...this.commands.map((command) => command.builder.toJSON()),
        ...this.contextMenus.map((context) => context.builder.toJSON()),
      ];
      const hash = createHash('md5').update(JSON.stringify(data)).digest('hex');

      const filePath = resolve(this.cacheFolderPath, 'application-commands.cache');

      if (env.NODE_ENV == 'development') {
        const devGuildId = env.DEV_GUILD_ID.split(',');
        if (!devGuildId?.length) return;

        for (const id of devGuildId) {
          const guild = this.guilds.cache.get(id);
          if (!guild) return;

          Logger.debug(
            `Updating application commands in ${guild.name} (${id}). (DEV_GUILD_ID=${devGuildId})`,
          );
          await guild.commands.set(data);
        }

        await this.application.commands.set([]);
        return;
      }

      if (existsSync(filePath)) {
        if (!force && readFileSync(filePath, { encoding: 'utf8' }) == hash) return;
      }

      Logger.info('Updating global application commands...');

      await this.application.commands.set(data);

      safeWriteFileSync(filePath, hash, { encoding: 'utf8' });

      const totalCommands = this.commands.size + this.contextMenus.size;
      Logger.info(`Successfully updated ${totalCommands} application commands (${this.commands.size} slash commands, ${this.contextMenus.size} context menus)`);
    }
    catch (error) {
      Logger.error('Error while updating application commands', error);
    }
  }
}
