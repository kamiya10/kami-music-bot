import { Events } from "discord.js";
import Logger from "@/core/logger";

import type { KamiEventListener } from ".";

export default {
  name : Events.InteractionCreate,
  async on(interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.isAutocomplete()) return;
    if (!interaction.inCachedGuild()) return;

    const command = this.commands.get(interaction.commandName);

    if (!command) return;

    try {
      if (command.defer) {
        await interaction.deferReply({
          ephemeral : command.ephemeral,
        });
      }

      await command.execute.call(this, interaction);
    } catch (error) {
      Logger.error(error);
      const msg = `There was an error while executing this command!\n${error}`;

      if (command.defer) {
        await interaction.deleteReply().catch(() => void 0);
        await interaction.followUp({ content : msg, ephemeral : true });
      } else {
        await interaction.reply({ content : msg, ephemeral : true });
      }
    }
  },
} as KamiEventListener<Events.InteractionCreate>;
