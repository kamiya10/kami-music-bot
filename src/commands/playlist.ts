import { SlashCommandBuilder } from 'discord.js';

import { KamiCommand } from '@/core/command';

import add from './playlist/add';
import create from './playlist/create';
import list from './playlist/list';

const command = new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('playlist')
    .setNameLocalization('zh-TW', '播放清單')
    .setDescription('Manage your playlists')
    .setDescriptionLocalization('zh-TW', '管理你的播放清單'),
  subcommands: [add, create, list],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'add':
        await add.execute.call(this, interaction);
        break;
      case 'create':
        await create.execute.call(this, interaction);
        break;
      case 'list':
        await list.execute.call(this, interaction);
        break;
    }
  },
  onAutocomplete(interaction) {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'add':
        add.onAutocomplete!.call(this, interaction);
        break;
    }
  },
});

export default command;
