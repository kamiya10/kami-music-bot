import { Events } from "discord.js";
import { inspect } from "bun";

import type { KamiEventListener } from "@/event";


export default {
  name : Events.InteractionCreate,
  on(interaction) {
    if (!interaction.isAutocomplete()) return;
    if (!interaction.inCachedGuild()) return;

    console.log(inspect(interaction));
  },
} as KamiEventListener<Events.InteractionCreate>;
