import { SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, bold, hyperlink } from 'discord.js';
import { eq, inArray } from 'drizzle-orm';

import { KamiSubcommand } from '@/core/command';
import Logger from '@/utils/logger';
import { db } from '@/database';
import { deferEphemeral } from '@/utils/callback';
import { playlist } from '@/database/schema';
import { resource } from '@/database/schema/resource';
import { user } from '@/utils/embeds';

const nameOption = new SlashCommandStringOption()
  .setName('name')
  .setNameLocalization('zh-TW', '名稱')
  .setDescription('Name of the playlist to remove from')
  .setDescriptionLocalization('zh-TW', '要移除項目的播放清單名稱')
  .setRequired(true)
  .setAutocomplete(true);

const indexOption = new SlashCommandIntegerOption()
  .setName('index')
  .setNameLocalization('zh-TW', '編號')
  .setDescription('The index of the song to remove (starting from 1)')
  .setDescriptionLocalization('zh-TW', '要移除的項目編號（從1開始）')
  .setRequired(true)
  .setMinValue(1);

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('remove')
    .setNameLocalization('zh-TW', '移除')
    .setDescription('Remove a song from your playlist')
    .setDescriptionLocalization('zh-TW', '從播放清單中移除項目')
    .addStringOption(nameOption)
    .addIntegerOption(indexOption),

  async execute(interaction) {
    await deferEphemeral(interaction);

    const playlistName = interaction.options.getString('name', true);
    const index = interaction.options.getInteger('index', true);

    try {
      const playlistData = await db.query.playlist.findFirst({
        where: (playlist, { and }) => and(
          eq(playlist.name, playlistName),
          eq(playlist.ownerId, interaction.user.id),
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

      if (index > resources.length) {
        const embed = user(interaction)
          .error(`播放清單中只有 ${resources.length} 首項目`)
          .embed;

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      const removedResource = resources[index - 1];
      const updatedResources = playlistData.resources.filter((id) => id !== `${removedResource.id}@${removedResource.type}`);

      await db
        .update(playlist)
        .set({ resources: updatedResources })
        .where(eq(playlist.id, playlistData.id));

      const embed = user(interaction)
        .success(
          `已從播放清單「${
            bold(playlistName)
          }」中移除「${
            hyperlink(removedResource.title, removedResource.url)
          }」`,
        )
        .embed;

      await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
      Logger.error('Failed to remove song from playlist', error);

      const embed = user(interaction)
        .error('移除項目失敗，請稍後再試')
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
        resources: true,
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
