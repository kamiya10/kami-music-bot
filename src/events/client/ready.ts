import { Events } from "discord.js";

import logger from "@/utils/logger";

import type { KamiEventListener } from "@/events";

const name = Events.ClientReady;

export default {
  name,
  async on(client) {
    await this.updateCommands();
    logger.info(`Logged in as ${client.user.tag}`);
  },
} as KamiEventListener<typeof name>;