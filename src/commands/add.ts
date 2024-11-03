import { SlashCommandBuilder } from 'discord.js';

import { KamiCommand } from '@/core/command';

import youtube from './add/youtube';

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('add')
    .setNameLocalization('zh-TW', '新增')
    .setDescription('Add resource to the queue')
    .setDescriptionLocalization('zh-TW', '新增資源到播放器的播放佇列'),
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
