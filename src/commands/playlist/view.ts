import { Colors, EmbedBuilder, MessageFlags, SlashCommandSubcommandBuilder, hyperlink } from 'discord.js';
import { eq } from 'drizzle-orm';

import { KamiSubcommand } from '@/core/command';
import { PaginationManager } from '@/utils/pagination';
import { db } from '@/database';
import { deferEphemeral } from '@/utils/callback';
import { playlist } from '@/database/schema';
import { resource } from '@/database/schema/resource';

import type { InferSelectModel } from 'drizzle-orm';
import type { InteractionEditReplyOptions } from 'discord.js';

type Resource = InferSelectModel<typeof resource>;

const command = new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('view')
    .setNameLocalization('zh-TW', '查看')
    .setDescription('View a playlist')
    .setDescriptionLocalization('zh-TW', '查看播放清單')
    .addStringOption((option) => option
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

    // Get playlist
    const playlistData = await db.query.playlist.findFirst({
      where: eq(playlist.name, playlistName),
      with: {
        resources: true,
      },
    });

    if (!playlistData) {
      const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription('❌ 找不到播放清單');
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (playlistData.ownerId !== userId) {
      const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setDescription('❌ 你沒有權限查看這個播放清單');
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // Get resources for the playlist
    const resources = await db.query.resource.findMany({
      where: eq(resource.resourceId, playlistData.resources[0]),
    });

    const paginationManager = new PaginationManager<Resource>({
      items: resources,
      itemsPerPage: 10,
      customId: `playlist_view_${playlistData.id}`,
      embedBuilder: (items, currentPage, totalPages) => {
        const embed = new EmbedBuilder()
          .setColor(Colors.Blue)
          .setTitle(`🎵 ${playlistData.name}`)
          .setDescription(
            items.length > 0
              ? items.map((song, i) =>
                `${(currentPage - 1) * 10 + i + 1}. ${hyperlink(song.title, song.url)}`,
              ).join('\n')
              : '這個播放清單沒有任何歌曲',
          )
          .setFooter({ text: `第 ${currentPage}/${totalPages} 頁 • ${resources.length} 首歌曲` });
        return embed;
      },
    });

    const reply = paginationManager.createReply();
    const message = await interaction.editReply(reply as InteractionEditReplyOptions);

    // Create collector for button interactions
    const collector = message.createMessageComponentCollector({
      time: 5 * 60 * 1000, // 5 minutes
    });

    collector.on('collect', (i) => {
      if (i.user.id !== interaction.user.id) {
        void i.reply({
          content: '❌ 你不能使用這些按鈕',
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }

      void paginationManager.handleInteraction(i);
    });

    collector.on('end', () => {
      const disabledReply = { ...reply, components: [] } as InteractionEditReplyOptions;
      void interaction.editReply(disabledReply);
    });
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
      .map((p: { name: string }) => p.name)
      .filter((name: string) => name.toLowerCase().includes(focusedValue.toLowerCase()))
      .slice(0, 25);

    await interaction.respond(
      filtered.map((name: string) => ({
        name,
        value: name,
      })),
    );
  },
});

export default command;
