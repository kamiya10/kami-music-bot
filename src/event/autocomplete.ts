import { Events } from "discord.js";
import type { KamiEventListener } from ".";

export default {
  name : Events.InteractionCreate,
  on(interaction) {
    autocompletedata[interaction.user.id] ??= {};
    autocompletedata[interaction.user.id].interaction = interaction;

    if (interaction.options.getSubcommand(false) == "search") {
      const checkTyping = async () => {
        if (autocompletedata[interaction.user.id].is_typing) {
          setTimeout(checkTyping, 100);
        } else {
          const focused =
            autocompletedata[
              interaction.user.id
            ].interaction.options.getFocused(true);
          let choices = [];

          if (focused.value.length > 1) {
            switch (focused.name) {
              case "query": {
                Logger.debug(`Searching term: ${focused.value}`);
                choices = (await Youtube.searchVideos(focused.value, 25))
                  .slice(0, 25)
                  .map((result) => {
                    client.apiCache.set(result.id, result);
                    return {
                      name : (result.title.length > 100
                        ? result.title.slice(0, 99) + "…"
                        : result.title
                      ).replace(/&amp;/g, "&"),
                      value : result.id,
                    };
                  });
                break;
              }

              default:
                break;
            }
          }

          await interaction.respond(choices);
        }
      };

      if (!autocompletedata[interaction.user.id].is_typing) {
        autocompletedata[interaction.user.id].is_typing = true;
        checkTyping();
      }

      if (autocompletedata[interaction.user.id].timer) {
        clearTimeout(autocompletedata[interaction.user.id].timer);
      }

      autocompletedata[interaction.user.id].timer = setTimeout(() => {
        autocompletedata[interaction.user.id].is_typing = false;
        autocompletedata[interaction.user.id].timer = null;
      }, 400);
    }
  },
} as KamiEventListener<Events.InteractionCreate>;
