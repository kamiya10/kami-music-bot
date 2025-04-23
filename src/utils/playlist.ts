import { ButtonInteraction, ChatInputCommandInteraction, MessageContextMenuCommandInteraction, StringSelectMenuInteraction, bold, hyperlink } from 'discord.js';
import { type InferSelectModel, eq } from 'drizzle-orm';

import { db } from '@/database';
import { playlist as playlistTable } from '@/database/schema/playlist';

import { createErrorEmbed, createPlaylistEmbed } from './embeds';
import Logger from './logger';

import type { KamiResource } from '@/core/resource';

export const addToPlaylist = async (
  interaction: ButtonInteraction<'cached'> | ChatInputCommandInteraction<'cached'> | MessageContextMenuCommandInteraction<'cached'> | StringSelectMenuInteraction<'cached'>,
  playlist: InferSelectModel<typeof playlistTable>,
  resources: KamiResource[],
) => {
  try {
    await db
      .update(playlistTable)
      .set({
        resources: [
          ...playlist.resources,
          ...resources.map((r) => `${r.id}@${r.type}`),
        ],
      })
      .where(eq(playlistTable.id, playlist.id));

    const embed = createPlaylistEmbed({
      user: interaction.member,
      description: resources.length === 1
        ? `✅ 已將「${bold(hyperlink(resources[0].title, resources[0].url))}」加入播放清單「${bold(playlist.name)}」`
        : `✅ 已將 ${resources.length} 個資源加入播放清單「${bold(playlist.name)}」`,
      thumbnail: resources[0].thumbnail,
    });

    if ('update' in interaction) {
      await interaction.update({
        embeds: [embed],
        components: [],
      });
    }
    else {
      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    }
  }
  catch (error) {
    Logger.error('addToPlaylist', error);

    const embed = createErrorEmbed(interaction.member, '未知錯誤');

    if ('update' in interaction) {
      await interaction.update({
        embeds: [embed],
        components: [],
      });
    }
    else {
      await interaction.editReply({
        embeds: [embed],
        components: [],
      });
    }
  }
};
