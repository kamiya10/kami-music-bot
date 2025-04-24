import { SlashCommandSubcommandBuilder, TimestampStyles, bold, inlineCode, time, unorderedList } from 'discord.js';
import { eq } from 'drizzle-orm';

import { KamiSubcommand } from '@/core/command';
import Logger from '@/utils/logger';
import { db } from '@/database';
import { deferEphemeral } from '@/utils/callback';
import { getCommandId } from '@/utils/client';
import { playlist } from '@/database/schema';
import { user } from '@/utils/embeds';

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('list')
    .setNameLocalization('ja', '一覧')
    .setNameLocalization('zh-TW', '列表')
    .setDescription('List all your playlists')
    .setDescriptionLocalization('ja', 'プレイリストの一覧を表示する')
    .setDescriptionLocalization('zh-TW', '列出所有播放清單'),

  async execute(interaction) {
    await deferEphemeral(interaction);

    try {
      const playlists = await db.query.playlist.findMany({
        where: eq(playlist.ownerId, interaction.user.id),
      });

      if (playlists.length === 0) {
        const embed = user(interaction)
          .info(`你還沒有任何播放清單，使用 </playlist create:${
            getCommandId('playlist', this)
          }> 來建立一個！`)
          .embed;

        await interaction.editReply({
          embeds: [embed],
        });
        return;
      }

      const description = ['以下是你的所有播放清單：'];

      const playlistDescription = playlists.map((p) => `${
        bold(p.name)
      } - ${
        inlineCode(p.resources.length.toString())
      } 首歌曲 • 最後更新：${
        time(p.updatedAt, TimestampStyles.LongDateTime)
      }`);

      description.push(
        unorderedList(playlistDescription),
        `\n使用 </playlist view:${getCommandId('playlist', this)}> 來查看播放清單的內容`,
      );

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
