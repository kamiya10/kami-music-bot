import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { type InferSelectModel } from 'drizzle-orm';

import { playlist } from '@/database/schema';

type Playlist = InferSelectModel<typeof playlist>;

export function createConfirmationButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('add_anyway')
        .setLabel('仍要加入')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('取消')
        .setStyle(ButtonStyle.Secondary),
    );
}

export function createPlaylistSelector(playlists: Playlist[]): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_playlist')
        .setPlaceholder('選擇要加入的播放清單')
        .addOptions(
          playlists.map((playlist) => ({
            label: playlist.name,
            value: playlist.id,
          })),
        ),
    );
}
