import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandStringOption, SlashCommandSubcommandBuilder, bold } from 'discord.js';
import { eq } from 'drizzle-orm';

import { deferEphemeral, noop } from '@/utils/callback';
import { KamiSubcommand } from '@/core/command';
import Logger from '@/utils/logger';
import { db } from '@/database';
import { playlist } from '@/database/schema';
import { user } from '@/utils/embeds';

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('delete')
    .setNameLocalization('zh-TW', '刪除')
    .setDescription('Delete a playlist')
    .setDescriptionLocalization('zh-TW', '刪除播放清單')
    .addStringOption(new SlashCommandStringOption()
      .setName('name')
      .setNameLocalization('zh-TW', '名稱')
      .setDescription('The name of the playlist to delete')
      .setDescriptionLocalization('zh-TW', '要刪除的播放清單名稱')
      .setRequired(true)
      .setAutocomplete(true),
    ),

  async execute(interaction) {
    await deferEphemeral(interaction);

    const playlistName = interaction.options.getString('name', true);
    const userId = interaction.user.id;

    const playlistData = await db.query.playlist.findFirst({
      where: eq(playlist.name, playlistName),
    });

    if (!playlistData) {
      const embed = user(interaction)
        .error('找不到播放清單')
        .embed;

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (playlistData.ownerId !== userId) {
      const embed = user(interaction)
        .error('你沒有權限刪除這個播放清單')
        .embed;

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_delete')
          .setLabel('確認刪除')
          .setStyle(ButtonStyle.Danger),
      );

    const confirmEmbed = user(interaction)
      .warn(`確定要刪除播放清單「${bold(playlistName)}」嗎？這個動作無法復原。`)
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
        await db.delete(playlist).where(eq(playlist.id, playlistData.id));

        const successEmbed = user(confirmation.member, '播放清單')
          .success(`已刪除播放清單「${bold(playlistName)}」`)
          .embed;

        await confirmation.update({
          embeds: [successEmbed],
          components: [],
        });
      }
      catch (error) {
        Logger.error('Playlist delete failed', error);

        const errorEmbed = user(confirmation.member, '播放清單')
          .error('刪除播放清單失敗，請稍後再試')
          .embed;

        await confirmation.update({
          embeds: [errorEmbed],
          components: [],
        });
      }
    }
    catch {
      Logger.error('Playlist delete timeout');

      const timeoutEmbed = user(interaction)
        .gray('操作逾時，已取消刪除播放清單')
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
