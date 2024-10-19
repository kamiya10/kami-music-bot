import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { existsSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve } from 'path';
import { safeWriteFileSync } from '@/utils/fs';
import { version } from '~/package.json';

import Logger from '@/utils/logger';
import commands from '&';
import events from '#';

import type { ClientOptions } from 'discord.js';
import type { KamiCommand } from '@/core/command';
import type { KamiMusicPlayer } from '@/core/player';

export class KamiClient extends Client {
  cacheFolderPath = resolve(process.env['CACHE_FOLDER'] ?? '.cache');
  commands = new Collection<string, KamiCommand>();
  players = new Collection<string, KamiMusicPlayer>();
  version = version;

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
        const devGuildId = process.env['DEV_GUILD_ID'];
        if (!devGuildId) return;

        const guild = this.guilds.cache.get(devGuildId);
        if (!guild) return;

        Logger.debug(
          `Updating commands in ${guild.name}. (DEV_GUILD_ID=${devGuildId})`,
        );
        await guild.commands.set(data);
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
