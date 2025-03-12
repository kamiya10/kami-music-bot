import { SlashCommandBuilder } from 'discord.js';

import { KamiCommand } from '@/core/command';
import { Platform } from '@/core/resource';

import soundcloud from './add/soundcloud';
import youtube from './add/youtube';

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('add')
    .setNameLocalization('zh-TW', '新增')
    .setDescription('Add resource to the queue')
    .setDescriptionLocalization('zh-TW', '新增資源到播放器的播放佇列'),
  groups: [youtube, soundcloud],
  execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    switch (group) {
      case Platform.YouTube:
        youtube.execute(this, interaction);
        break;
      case Platform.SoundCloud:
        soundcloud.execute(this, interaction);
        break;
    }
  },
  onAutocomplete(interaction) {
    const group = interaction.options.getSubcommandGroup();
    switch (group) {
      case Platform.YouTube:
        youtube.onAutocomplete(this, interaction);
        break;
    }
  },
});
