import { Colors, EmbedBuilder, SlashCommandBuilder, bold, hyperlink, orderedList } from 'discord.js';
import { KamiCommand } from '@/core/command';

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Display the current player\'s queue.'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const player = this.players.get(interaction.guild.id);

    if (!player) {
      void interaction.editReply({
        content: '目前沒有在播放音樂',
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.Blue)
      .setAuthor({
        name: `播放佇列 | ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL()!,
      })
      .setFooter({
        text: `${player?.queue.length} 個項目`,
      });

    const description = [];

    for (let index = 0, n = player.queue.length; index < n && index < 20; index++) {
      const resource = player.queue[index];
      const item = hyperlink(resource.title.slice(0, 40), resource.url);
      if (index == player.currentIndex && player.isPlaying) {
        description.push(bold(item));
      }
      else {
        description.push(item);
      }
    }

    if (!description.length) {
      embed.setDescription('-# 目前沒有任何項目，使用 `/add` 來新增項目*');
    }
    else {
      embed.setDescription(orderedList(description));
    }

    await interaction.editReply({
      embeds: [embed],
    });
  },
});
