import { Colors, EmbedBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder, hyperlink } from 'discord.js';
import { and, eq, inArray } from 'drizzle-orm';

import { KamiSubcommand } from '@/core/command';
import Logger from '@/utils/logger';
import { PaginationManager } from '@/utils/pagination';
import { db } from '@/database';
import { deferEphemeral } from '@/utils/callback';
import { playlist } from '@/database/schema';
import { resource } from '@/database/schema/resource';
import { user } from '@/utils/embeds';

import type { InferSelectModel } from 'drizzle-orm';

type Resource = InferSelectModel<typeof resource>;

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('view')
    .setNameLocalization('zh-TW', '查看')
    .setDescription('View a playlist')
    .setDescriptionLocalization('zh-TW', '查看播放清單')
    .addStringOption(new SlashCommandStringOption()
      .setName('name')
      .setNameLocalization('zh-TW', '名稱')
      .setDescription('The name of the playlist')
      .setDescriptionLocalization('zh-TW', '播放清單名稱')
      .setRequired(true)
      .setAutocomplete(true),
    ),

  async execute(interaction) {
    await deferEphemeral(interaction);

    const playlistName = interaction.options.getString('name', true);
    const userId = interaction.user.id;

    try {
      const playlistData = await db.query.playlist.findFirst({
        where: and(
          eq(playlist.name, playlistName),
          eq(playlist.ownerId, userId),
        ),
      });

      if (!playlistData) {
        const embed = user(interaction)
          .error('找不到播放清單')
          .embed;

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const resources = await db.query.resource.findMany({
        where: inArray(resource.resourceId, playlistData.resources),
      });

      const paginationManager = new PaginationManager<Resource>({
        items: resources,
        itemsPerPage: 10,
        customId: `playlist_view_${playlistData.id}`,
        embedBuilder: (items, currentPage, totalPages) => {
          const description = items.length > 0
            ? items.map((song, i) =>
              `${(currentPage - 1) * 10 + i + 1}. ${hyperlink(song.title, song.url)}`,
            ).join('\n')
            : '這個播放清單沒有任何歌曲';

          const embed = new EmbedBuilder()
            .setColor(Colors.Blue)
            .setTitle(`🎵 ${playlistData.name}`)
            .setDescription(description)
            .setFooter({ text: `第 ${currentPage}/${totalPages} 頁 • ${resources.length} 首歌曲` });

          return embed;
        },
      });

      await paginationManager.handle(interaction);
    }
    catch (error) {
      Logger.error('Failed to view playlist', error);

      const embed = user(interaction)
        .error('查看播放清單時發生錯誤，請稍後再試')
        .embed;

      await interaction.editReply({ embeds: [embed] });
    }
  },

  async onAutocomplete(interaction) {
    const userId = interaction.user.id;
    const focusedValue = interaction.options.getFocused();

    const userPlaylists = await db.query.playlist.findMany({
      where: eq(playlist.ownerId, userId),
      columns: {
        name: true,
      },
    });

    const filtered = userPlaylists
      .map((p) => p.name)
      .filter((name) => name.toLowerCase().includes(focusedValue.toLowerCase()))
      .slice(0, 25);

    await interaction.respond(
      filtered.map((name) => ({
        name,
        value: name,
      })),
    );
  },
});
