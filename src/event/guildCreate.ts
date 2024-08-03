import { Events } from "discord.js";

import Logger from "@/coree/logger";
import chalk from "chalk";

import type { KamiEventListener } from ".";

export default {
  name: Events.GuildCreate,
  on(guild) {
    Logger.info(`Joined ${guild.name} ${chalk.gray(guild.id)}`);
  },
} as KamiEventListener<Events.GuildCreate>;
