import { ApplicationCommandType, ContextMenuCommandBuilder, MessageContextMenuCommandInteraction } from 'discord.js';

import { KamiContext } from '@/core/context';
import { KamiResource } from '@/core/resource';
import Logger from '@/utils/logger';
import { PlaylistService } from '@/services/playlist';
import { ResourceResolver } from '@/services/resource';
import { createErrorEmbed } from '@/utils/embeds';
import { deferEphemeral } from '@/utils/callback';

export default new KamiContext({
  builder: new ContextMenuCommandBuilder()
    .setName('Add to playlist')
    .setType(ApplicationCommandType.Message),
  onMessage: async function (interaction: MessageContextMenuCommandInteraction<'cached'>) {
    await deferEphemeral(interaction);

    const message = interaction.targetMessage;
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = message.content.match(urlRegex);

    if (!urls) {
      const embed = createErrorEmbed(
        interaction.member,
        '找不到任何有效的網址',
      );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const resources: KamiResource[] = [];
    const resolver = new ResourceResolver(this);

    for (const url of urls) {
      try {
        const resource = await resolver.resolve(url);
        if (resource) {
          resources.push(resource);
        }
      }
      catch (error) {
        if (error instanceof Error) {
          Logger.error(`Failed to resolve URL: ${url}`, error.message);
        }
      }
    }

    if (resources.length === 0) {
      const embed = createErrorEmbed(
        interaction.member,
        '找不到任何有效的資源',
      );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const service = new PlaylistService();
    const playlists = await service.getUserPlaylists(interaction.user.id);

    if (playlists.length === 0) {
      const embed = createErrorEmbed(
        interaction.member,
        '你還沒有建立任何播放清單',
      );

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (playlists.length === 1) {
      await service.handleSinglePlaylist(interaction, playlists[0], resources);
    }
    else {
      await service.handleMultiplePlaylists(interaction, playlists, resources);
    }
  },
});
