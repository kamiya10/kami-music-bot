import { Colors, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';

import { KamiSubcommand } from '@/core/command';
import { db } from '@/database';
import { deferEphemeral } from '@/utils/callback';
export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('list')
    .setNameLocalization('zh-TW', '列表')
    .setDescription('List your playlists')
    .setDescriptionLocalization('zh-TW', '列出你的播放清單'),
  async execute(interaction) {
    await deferEphemeral(interaction);

    try {
      const playlists = await db.query.playlist.findMany({
        where: (playlist, { eq }) => eq(playlist.ownerId, interaction.user.id),
      });

      if (playlists.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(Colors.Red)
          .setAuthor({
            name: `播放清單 | ${interaction.guild.name}`,
            iconURL: interaction.guild.iconURL() ?? undefined,
          })
          .setDescription('❌ 你還沒有任何播放清單，使用 `/playlist create` 來建立一個！')
          .setTimestamp();

        await interaction.editReply({
          embeds: [embed],
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.Blue)
        .setAuthor({
          name: `播放清單 | ${interaction.guild.name}`,
          iconURL: interaction.guild.iconURL() ?? undefined,
        })
        .setDescription('以下是你的所有播放清單：')
        .addFields(
          playlists.map((playlist) => ({
            name: playlist.name,
            value: `${playlist.resources.length} 首歌曲 • 最後更新：${playlist.updatedAt.toLocaleDateString()}`,
            inline: true,
          })),
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
      const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setAuthor({
          name: `播放清單 | ${interaction.guild.name}`,
          iconURL: interaction.guild.iconURL() ?? undefined,
        })
        .setDescription('❌ 取得播放清單失敗，請稍後再試')
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });
    }
  },
});
