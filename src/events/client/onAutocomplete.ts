import { EventHandler } from '@/core/event';
import { Events } from 'discord.js';

export default new EventHandler({
  event: Events.InteractionCreate,
  async on(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isAutocomplete()) return;

    const command = this.commands.get(interaction.commandName);

    if (!command) return;

    await command.onAutocomplete?.call(this, interaction);
  },
});
