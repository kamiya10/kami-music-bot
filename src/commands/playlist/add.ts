import { ActionRowBuilder, AutocompleteInteraction, ButtonBuilder, ButtonInteraction, ButtonStyle, Colors, ComponentType, EmbedBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder } from 'discord.js';
import { eq } from 'drizzle-orm';

import { KamiSubcommand } from '@/core/command';
import { Platform } from '@/core/resource';
import { db } from '@/database';
import { deferEphemeral } from '@/utils/callback';
import { playlist as playlistTable } from '@/database/schema/playlist';
import { user } from '@/utils/embeds';

import type { ChatInputCommandInteraction } from 'discord.js';
import type { InferSelectModel } from 'drizzle-orm';
import type { KamiResource } from '@/core/resource';

const nameOption = new SlashCommandStringOption()
  .setName('name')
  .setNameLocalization('zh-TW', '名稱')
  .setDescription('Name of the playlist to add to')
  .setDescriptionLocalization('zh-TW', '要加入的播放清單名稱')
  .setRequired(true)
  .setAutocomplete(true);

const addToPlaylist = async (
  interaction: ButtonInteraction<'cached'> | ChatInputCommandInteraction<'cached'>,
  playlist: InferSelectModel<typeof playlistTable>,
  resource: KamiResource,
) => {
  try {
    await db
      .update(playlistTable)
      .set({
        resources: [...playlist.resources, `${resource.id}@${resource.type}`],
      })
      .where(eq(playlistTable.id, playlist.id));

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setAuthor({
        name: `播放清單 | ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL() ?? undefined,
      })
      .setDescription(`✅ 已將 "${resource.title}" 加入播放清單 "${playlist.name}"`)
      .setThumbnail(resource.thumbnail)
      .setTimestamp();

    if ('update' in interaction) {
      await interaction.update({
        embeds: [embed],
        components: [],
      });
    }
    else {
      await interaction.editReply({
        embeds: [embed],
      });
    }
  }
  catch (error) {
    const embed = new EmbedBuilder()
      .setColor(Colors.Red)
      .setAuthor({
        name: `播放清單 | ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL() ?? undefined,
      })
      .setDescription('❌ 加入播放清單失敗，請稍後再試')
      .setTimestamp();

    if ('update' in interaction) {
      await interaction.update({
        embeds: [embed],
        components: [],
      });
    }
    else {
      await interaction.editReply({
        embeds: [embed],
      });
    }
  }
};

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('add')
    .setNameLocalization('zh-TW', '加入')
    .setDescription('Add currently playing resource to a playlist')
    .setDescriptionLocalization('zh-TW', '將目前播放的歌曲加入播放清單')
    .addStringOption(nameOption),
  async onAutocomplete(interaction: AutocompleteInteraction<'cached'>) {
    const focusedValue = interaction.options.getFocused().toString();

    const playlists = await db.query.playlist.findMany({
      where: (playlist, { and, like }) => and(
        eq(playlist.ownerId, interaction.user.id),
        like(playlist.name, `%${focusedValue}%`),
      ),
      columns: {
        name: true,
      },
    });

    await interaction.respond(
      playlists
        .map((playlist) => ({
          name: playlist.name,
          value: playlist.name,
        }))
        .slice(0, 25),
    );
  },
  async execute(interaction) {
    await deferEphemeral(interaction);

    const name = interaction.options.getString('name', true);
    const player = this.players.get(interaction.guildId);

    if (!player?.currentResource) {
      const embed = user(interaction)
        .error('❌ 目前沒有正在播放的歌曲')
        .embed;

      await interaction.editReply({
        embeds: [embed],
      });
      return;
    }

    if (player.currentResource.metadata.type === Platform.File) {
      const embed = user(interaction)
        .error('❌ 無法將自定音檔加入至播放清單')
        .embed;

      await interaction.editReply({
        embeds: [embed],
      });
      return;
    }

    try {
      const targetPlaylist = await db.query.playlist.findFirst({
        where: (playlist, { and }) => and(
          eq(playlist.name, name),
          eq(playlist.ownerId, interaction.user.id),
        ),
      });

      if (!targetPlaylist) {
        const embed = user(interaction)
          .error(`❌ 找不到名為 "${name}" 的播放清單`)
          .embed;

        await interaction.editReply({
          embeds: [embed],
        });
        return;
      }

      const resourceId = `${player.currentResource.metadata.id}@${player.currentResource.metadata.type}`;

      if (!targetPlaylist.resources.includes(resourceId)) {
        await addToPlaylist(
          interaction,
          targetPlaylist,
          player.currentResource.metadata,
        );
      }
      else {
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('add_anyway')
              .setLabel('仍要加入')
              .setStyle(ButtonStyle.Primary),
          );

        const embed = new EmbedBuilder()
          .setColor(Colors.Yellow)
          .setAuthor({
            name: `播放清單 | ${interaction.guild.name}`,
            iconURL: interaction.guild.iconURL() ?? undefined,
          })
          .setDescription(`⚠️ "${player.currentResource.metadata.title}" 已經在播放清單 "${name}" 中`)
          .setThumbnail(player.currentResource.metadata.thumbnail)
          .setTimestamp();

        const response = await interaction.editReply({
          embeds: [embed],
          components: [row],
        });

        try {
          const confirmation = await response.awaitMessageComponent({
            filter: (i) => i.user.id === interaction.user.id,
            time: 60_000,
            componentType: ComponentType.Button,
          });

          if (confirmation.customId === 'add_anyway') {
            await addToPlaylist(
              confirmation,
              targetPlaylist,
              player.currentResource.metadata,
            );
          }
        }
        catch (error) {
          await interaction.deleteReply();
        }
      }
    }
    catch (error) {
      const embed = user(interaction)
        .error('❌ 加入播放清單失敗，請稍後再試')
        .embed;

      await interaction.editReply({
        embeds: [embed],
      });
    }
  },
});
