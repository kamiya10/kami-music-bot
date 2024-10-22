import { KamiCommand } from '@/core/command';
import { SlashCommandBuilder } from 'discord.js';
import youtube from './add/youtube';

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add resource to the queue'),
  groups: [youtube],
  execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    switch (group) {
      case 'youtube':
        youtube.execute(this, interaction);
        break;
    }
  },
  onAutocomplete(interaction) {
    const group = interaction.options.getSubcommandGroup();
    switch (group) {
      case 'youtube':
        youtube.onAutocomplete(this, interaction);
        break;
    }
  },
});
