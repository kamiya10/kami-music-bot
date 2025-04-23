import { SlashCommandSubcommandBuilder } from 'discord.js';
import { eq } from 'drizzle-orm';

import { KamiSubcommand } from '@/core/command';
import Logger from '@/utils/logger';
import { db } from '@/database';
import { deferEphemeral } from '@/utils/callback';
import { playlist } from '@/database/schema';
import { user } from '@/utils/embeds';

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
        where: eq(playlist.ownerId, interaction.user.id),
      });

      if (playlists.length === 0) {
        const embed = user(interaction)
          .info('你還沒有任何播放清單，使用 `/playlist create` 來建立一個！')
          .embed;

        await interaction.editReply({
          embeds: [embed],
        });
        return;
      }

      const description = ['以下是你的所有播放清單：'];
      playlists.forEach((p) => {
        description.push(`• **${p.name}** - ${p.resources.length} 首歌曲 • 最後更新：${p.updatedAt.toLocaleDateString()}`);
      });

      const embed = user(interaction)
        .info(description.join('\n'))
        .embed;

      await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
      Logger.error('Failed to fetch playlists', error);

      const embed = user(interaction)
        .error('取得播放清單失敗，請稍後再試')
        .embed;

      await interaction.editReply({
        embeds: [embed],
      });
    }
  },
});
