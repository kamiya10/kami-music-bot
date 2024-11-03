import { Events } from 'discord.js';

import { EventHandler } from '@/core/event';

export default new EventHandler({
  event: Events.InteractionCreate,
  async on(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);

    if (!command) return;

    await command.execute.call(this, interaction);
  },
});
