import { SlashCommandBuilder } from 'discord.js';

import { KamiCommand } from '@/core/command';
import { Platform } from '@/core/resource';

import playlist from './add/playlist';
import soundcloud from './add/soundcloud';
import youtube from './add/youtube';

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('add')
    .setNameLocalization('ja', '追加')
    .setNameLocalization('zh-TW', '新增')
    .setDescription('Add resource to the queue')
    .setDescriptionLocalization('ja', 'キューにリソースを追加する')
    .setDescriptionLocalization('zh-TW', '新增資源到播放器的播放佇列'),
  groups: [youtube, soundcloud],
  subcommands: [playlist],
  execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    switch (group) {
      case Platform.YouTube:
        youtube.execute(this, interaction);
        return;
      case Platform.SoundCloud:
        soundcloud.execute(this, interaction);
        return;
    }
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'playlist':
        playlist.execute.call(this, interaction);
        return;
    }
  },
  onAutocomplete(interaction) {
    const group = interaction.options.getSubcommandGroup();
    switch (group) {
      case Platform.YouTube:
        youtube.onAutocomplete(this, interaction);
        return;
      case Platform.SoundCloud:
        soundcloud.onAutocomplete(this, interaction);
        return;
    }
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'playlist':
        playlist.onAutocomplete?.call(this, interaction);
        return;
    }
  },
});
