import { Events } from "discord.js";
import { ExecutionResultType } from "&";

import SlashCommandRejectionError from "@/errors/SlashCommandRejectionError";
import logger from "@/utils/logger";

import type { KamiEventListener } from "@/events";

const name = Events.InteractionCreate;

export default {
  name,
  on(interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.inCachedGuild()) return;
    
    const command = this.commands.get(interaction.commandName);

    if (!command) return;

    if (command.defer) {
      interaction
        .deferReply({ ephemeral: command.ephemeral })
        .then(() => logger.debug(`Interaction ${interaction.id} deferred`))
        .catch(e => void e);
    }

    logger.debug(`Interaction ${interaction.id} execute command ${command.data.name}`);

    void command.execute
      .call(this, interaction)
      .then((result) => {
        switch (result.type) {
          case ExecutionResultType.SingleSuccess: {
            if (command.defer) {
              void interaction.editReply(result.payload).catch(e => void e);
            } else {
              void interaction.reply(result.payload).catch(e => void e);
            }
          }
        }
      })
      .catch((error) => {
        if (error instanceof SlashCommandRejectionError) {
          if (command.defer) {
            void interaction.editReply(error.payload).catch(e => void e);
          } else {
            void interaction.reply(error.payload).catch(e => void e);
          }
        }
      });
  },
} as KamiEventListener<typeof name>;