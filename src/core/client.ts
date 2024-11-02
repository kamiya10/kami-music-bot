import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Client, Collection, GatewayIntentBits } from 'discord.js';

import events from '#';
import commands from '&';
import { safeWriteFileSync } from '@/utils/fs';
import Logger from '@/utils/logger';
import pkg from '~/package.json';

import type { KamiCommand } from '@/core/command';
import type { KamiMusicPlayer } from '@/core/player';
import type { ClientOptions } from 'discord.js';

export class KamiClient extends Client {
  cacheFolderPath = resolve(process.env['CACHE_FOLDER'] ?? '.cache');
  commands = new Collection<string, KamiCommand>();
  players = new Collection<string, KamiMusicPlayer>();
  version = pkg.version;

  constructor(options?: ClientOptions) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
      ],
      ...options,
    });

    for (const command of commands) {
      this.commands.set(command.builder.name, command);
    }
    Logger.debug(`Loaded ${this.commands.size} commands`);

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
    Logger.debug(`Loaded ${events.length} event handlers`);
  }

  async updateCommands(force = false) {
    if (!this.isReady()) {
      Logger.error('Client isn\'t ready for command updates yet');
      return;
    }

    try {
      const data = this.commands.map((command) => command.builder.toJSON());
      const hash = createHash('md5').update(JSON.stringify(data)).digest('hex');

      const filePath = resolve(this.cacheFolderPath, 'commands.cache');

      if (process.env.NODE_ENV == 'development') {
        const devGuildId = process.env['DEV_GUILD_ID']?.split(',');
        if (!devGuildId?.length) return;

        for (const id of devGuildId) {
          const guild = this.guilds.cache.get(id);
          if (!guild) return;

          Logger.debug(
            `Updating commands in ${guild.name} (${id}). (DEV_GUILD_ID=${devGuildId})`,
          );
          await guild.commands.set(data);
        }
        return;
      }

      if (existsSync(filePath)) {
        if (!force && readFileSync(filePath, { encoding: 'utf8' }) == hash) return;
      }

      await this.application.commands.set(data);

      safeWriteFileSync(filePath, hash, { encoding: 'utf8' });

      Logger.info('Command updated successfully');
    }
    catch (error) {
      Logger.error('Error while updating commands', error);
    }
  }
}
