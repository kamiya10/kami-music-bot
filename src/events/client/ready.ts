import { EventHandler } from '@/core/event';
import { Events } from 'discord.js';

import Logger from "@/utils/logger";

export default new EventHandler({
  event: Events.ClientReady,
  async on(client) {
    await this.updateCommands();
    Logger.info(`Logged in as ${client.user.tag}`);
  },
});