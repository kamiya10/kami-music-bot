import { Events } from 'discord.js';

import { EventHandler } from '@/core/event';

export default new EventHandler({
  event: Events.InteractionCreate,
  async on(interaction) {
    if (!interaction.inCachedGuild()) return;
    if (!interaction.isContextMenuCommand()) return;

    const command = this.contextMenus.get(interaction.commandName);

    if (!command) return;

    if (interaction.isUserContextMenuCommand()) {
      if (!command.onUser) return;
      await command.onUser.call(this, interaction);
    }
    else {
      if (!command.onMessage) return;
      await command.onMessage.call(this, interaction);
    }
  },
});
