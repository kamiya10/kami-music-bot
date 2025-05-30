import { ActivityType, Events } from 'discord.js';

import { EventHandler } from '@/core/event';
import Logger from '@/utils/logger';
import { env } from '@/env';

export default new EventHandler({
  event: Events.ClientReady,
  async on(client) {
    await this.updateApplicationCommands();

    if (env.NODE_ENV === 'development') {
      await client.guilds.cache.get(env.DEV_GUILD_ID)?.commands.fetch();
    }
    else {
      await client.application.commands.fetch();
    }

    Logger.info(`Logged in as ${client.user.tag}`);

    const updateActivity = () => {
      client.user.setActivity({
        name: `v${this.version} | 🎵 ${this.players.size}`,
        type: ActivityType.Listening,
      });
    };
    updateActivity();
    setInterval(updateActivity, 600_000);
  },
});
