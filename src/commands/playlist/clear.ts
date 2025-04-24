import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandStringOption, SlashCommandSubcommandBuilder, bold } from 'discord.js';
import { and, eq } from 'drizzle-orm';

import { deferEphemeral, noop } from '@/utils/callback';
import { KamiSubcommand } from '@/core/command';
import Logger from '@/utils/logger';
import { db } from '@/database';
import { playlist } from '@/database/schema';
import { user } from '@/utils/embeds';

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('clear')
    .setNameLocalization('ja', 'クリア')
    .setNameLocalization('zh-TW', '清空')
    .setDescription('Clear all songs from a playlist')
    .setDescriptionLocalization('ja', 'プレイリストの曲をすべて削除する')
    .setDescriptionLocalization('zh-TW', '清空播放清單中的所有歌曲')
    .addStringOption(new SlashCommandStringOption()
      .setName('name')
      .setNameLocalization('ja', '名前')
      .setNameLocalization('zh-TW', '名稱')
      .setDescription('The name of the playlist to clear')
      .setDescriptionLocalization('ja', 'クリアするプレイリストの名前')
      .setDescriptionLocalization('zh-TW', '要清空的播放清單名稱')
      .setRequired(true)
      .setAutocomplete(true),
    ),

  async execute(interaction) {
    await deferEphemeral(interaction);

    const playlistName = interaction.options.getString('name', true);
    const userId = interaction.user.id;

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

    const songCount = playlistData.resources.length;

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_clear')
          .setLabel('確認清空')
          .setStyle(ButtonStyle.Danger),
      );

    const confirmEmbed = user(interaction)
      .warn(`確定要清空播放清單「${bold(playlistName)}」中的 ${bold(songCount.toString())} 首歌曲嗎？這個動作無法復原。`)
      .embed;

    const response = await interaction.editReply({
      embeds: [confirmEmbed],
      components: [row],
    });

    try {
      const confirmation = await response.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60_000,
        componentType: ComponentType.Button,
      });

      try {
        await db.update(playlist)
          .set({ resources: [], updatedAt: new Date() })
          .where(eq(playlist.id, playlistData.id));

        const successEmbed = user(confirmation.member, '播放清單')
          .success(`已從播放清單「${bold(playlistName)}」中清除了 ${bold(songCount.toString())} 首歌曲`)
          .embed;

        await confirmation.update({
          embeds: [successEmbed],
          components: [],
        });
      }
      catch (error) {
        Logger.error('Playlist clear failed', error);

        const errorEmbed = user(confirmation.member, '播放清單')
          .error('清空播放清單失敗，請稍後再試')
          .embed;

        await confirmation.update({
          embeds: [errorEmbed],
          components: [],
        });
      }
    }
    catch {
      Logger.error('Playlist clear timeout');

      const timeoutEmbed = user(interaction)
        .gray('操作逾時，已取消清空播放清單')
        .embed;

      await interaction.editReply({
        embeds: [timeoutEmbed],
        components: [],
      }).catch(noop);
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
