import { Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder, hyperlink } from 'discord.js';

import { KamiCommand } from '@/core/command';
import { PaginationManager } from '@/utils/pagination';

import type { InteractionEditReplyOptions } from 'discord.js';

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('queue')
    .setNameLocalization('ja', 'キュー')
    .setNameLocalization('zh-TW', '播放佇列')
    .setDescription('Display the current player\'s queue.')
    .setDescriptionLocalization('ja', '現在のプレイヤーのキューを表示する')
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

      await interaction.editReply({
        embeds: [embed],
      });
      return;
    }

    const paginationManager = new PaginationManager({
      items: player.queue,
      itemsPerPage: 10,
      customId: `queue_${interaction.guild.id}`,
      embedBuilder: (items, currentPage, totalPages) => {
        const embed = new EmbedBuilder()
          .setColor(Colors.Blue)
          .setAuthor({
            name: `播放佇列 | ${interaction.guild.name}`,
            iconURL: interaction.guild.iconURL()!,
          })
          .setDescription(
            items.length > 0
              ? items.map((resource, i) => {
                const index = (currentPage - 1) * 10 + i;
                const item = hyperlink(resource.title.slice(0, 40), resource.url);
                if (index === player.currentIndex && player.isPlaying) {
                  return `${index + 1}. 🎵 ${item}`;
                }
                return `${index + 1}. ${item}`;
              }).join('\n')
              : '目前沒有任何項目，使用 `/add` 來新增項目',
          )
          .setFooter({
            text: `Page ${currentPage}/${totalPages} • ${player.queue.length} items`,
          });
        return embed;
      },
    });

    const reply = paginationManager.createReply();
    const message = await interaction.editReply(reply as InteractionEditReplyOptions);

    const collector = message.createMessageComponentCollector({
      time: 5 * 60 * 1000, // 5 minutes
    });

    collector.on('collect', (i) => {
      if (i.user.id !== interaction.user.id) {
        void i.reply({
          content: '❌ You cannot use these buttons',
          ephemeral: true,
        });
        return;
      }

      void paginationManager.handleInteraction(i);
    });

    collector.on('end', () => {
      const disabledReply = { ...reply } as InteractionEditReplyOptions;
      if (disabledReply.components) {
        for (const row of disabledReply.components) {
          if ('components' in row) {
            for (const component of row.components) {
              if ('setDisabled' in component) {
                component.setDisabled(true);
              }
            }
          }
        }
      }
      void interaction.editReply(disabledReply);
    });
  },
});
