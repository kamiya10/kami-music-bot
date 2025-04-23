import { SlashCommandBuilder } from 'discord.js';

import { KamiCommand } from '@/core/command';

import add from './playlist/add';
import clear from './playlist/clear';
import create from './playlist/create';
import delete_ from './playlist/delete';
import list from './playlist/list';
import remove from './playlist/remove';
import view from './playlist/view';

const command = new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('playlist')
    .setNameLocalization('ja', 'プレイリスト')
    .setNameLocalization('zh-TW', '播放清單')
    .setDescription('Manage your playlists')
    .setDescriptionLocalization('ja', 'プレイリストを管理する')
    .setDescriptionLocalization('zh-TW', '管理你的播放清單'),
  subcommands: [add, clear, create, delete_, list, remove, view],
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'add':
        await add.execute.call(this, interaction);
        break;
      case 'create':
        await create.execute.call(this, interaction);
        break;
      case 'delete':
        await delete_.execute.call(this, interaction);
        break;
      case 'list':
        await list.execute.call(this, interaction);
        break;
      case 'remove':
        await remove.execute.call(this, interaction);
        break;
      case 'view':
        await view.execute.call(this, interaction);
        break;
    }
  },
  onAutocomplete(interaction) {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'add':
        add.onAutocomplete!.call(this, interaction);
        break;
      case 'clear':
        clear.onAutocomplete!.call(this, interaction);
        break;
      case 'delete':
        delete_.onAutocomplete!.call(this, interaction);
        break;
      case 'remove':
        remove.onAutocomplete!.call(this, interaction);
        break;
      case 'view':
        view.onAutocomplete!.call(this, interaction);
        break;
    }
  },
});

export default command;
