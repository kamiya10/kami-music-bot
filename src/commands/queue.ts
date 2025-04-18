import { Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder, bold, hyperlink, orderedList } from 'discord.js';

import { KamiCommand } from '@/core/command';

const range = (length: number, middle_index: number): [number, number] => {
  let n: number;
  let m: number;

  if (length <= 20) {
    n = 0;
    m = length;
  }
  else {
    n = middle_index - 10;

    if (n < 0) {
      n = 0;
    }

    m = n + 20;

    if (m > length) {
      m = length;
      n = m - 20;

      if (n < 0) {
        n = 0;
      }
    }
  }

  return [n, m];
};

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('queue')
    .setNameLocalization('zh-TW', '播放佇列')
    .setDescription('Display the current player\'s queue.')
    .setDescriptionLocalization('zh-TW', '查看播放器的播放佇列'),
  async execute(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const player = this.players.get(interaction.guild.id);

    if (!player) {
      const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setAuthor({
          name: `播放佇列 | ${interaction.guild.name}`,
          iconURL: interaction.guild.iconURL() ?? undefined,
        })
        .setDescription('❌ 目前沒有在播放音樂');

      void interaction.editReply({
        embeds: [embed],
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

    const [from, to] = range(player.queue.length, player.currentIndex);

    for (let index = from; index < to; index++) {
      const resource = player.queue[index];
      const item = hyperlink(resource.title.slice(0, 40), resource.url);
      if (index == player.currentIndex && player.isPlaying) {
        description.push(bold(`🎵 ${item}`));
      }
      else {
        description.push(item);
      }
    }

    if (!description.length) {
      embed.setDescription('-# 目前沒有任何項目，使用 `/add` 來新增項目*');
    }
    else {
      embed.setDescription(orderedList(description, from + 1));
    }

    await interaction.editReply({
      embeds: [embed],
    });
  },
});
