import { Events } from "discord.js";

import Logger from "@/core/logger";

import type { KamiEventListener } from "@/event";

export default {
  name : Events.ClientReady,
  once(client) {
    Logger.info(`Bot is ready: ${client.user.tag}`);

    setInterval(() => {
      client.user.setActivity(`${this.version} | 🎵 ${this.players.size}`);
    }, 60000);

    void this.updateCommands();
  },
} as KamiEventListener<Events.ClientReady>;
