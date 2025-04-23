import { SlashCommandBooleanOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, bold } from 'discord.js';
import { nanoid } from 'nanoid';

import { KamiResource } from '@/core/resource';
import { KamiSubcommand } from '@/core/command';
import Logger from '@/utils/logger';
import { db } from '@/database';
import { deferEphemeral } from '@/utils/callback';
import { getQueue } from '@/core/queue';
import { playlist } from '@/database/schema/playlist';
import { user } from '@/utils/embeds';

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('create')
    .setNameLocalization('zh-TW', '建立')
    .setDescription('Create a new playlist')
    .setDescriptionLocalization('zh-TW', '建立新的播放清單')
    .addStringOption(new SlashCommandStringOption()
      .setName('name')
      .setNameLocalization('zh-TW', '名稱')
      .setDescription('Name of the playlist')
      .setDescriptionLocalization('zh-TW', '播放清單名稱')
      .setRequired(true),
    )
    .addBooleanOption(new SlashCommandBooleanOption()
      .setName('save_queue')
      .setNameLocalization('zh-TW', '保存佇列')
      .setDescription('Save current queue to the playlist')
      .setDescriptionLocalization('zh-TW', '保存目前佇列到播放清單')
      .setRequired(false),
    ),

  async execute(interaction) {
    await deferEphemeral(interaction);

    const name = interaction.options.getString('name', true);
    const saveQueue = interaction.options.getBoolean('save_queue') ?? false;

    // Get current queue resources if requested
    const resources: string[] = [];
    if (saveQueue && interaction.guildId) {
      const queue = getQueue(interaction.guildId);
      if (queue?.resources) {
        resources.push(...queue.resources.map((resource: KamiResource) => resource.id));
      }
    }

    try {
      const id = nanoid();
      await db.insert(playlist).values({
        id,
        name,
        resources,
        ownerId: interaction.user.id,
      });

      const successEmbed = user(interaction)
        .success(
          saveQueue
            ? `已建立並將目前的播放佇列加入至播放清單「${bold(name)}」`
            : `已建立播放清單「${bold(name)}」`,
        )
        .embed;

      await interaction.editReply({
        embeds: [successEmbed],
      });
    }
    catch (error) {
      Logger.error('Playlist creation failed', error);

      const errorEmbed = user(interaction)
        .error('建立播放清單失敗，請稍後再試')
        .embed;

      await interaction.editReply({
        embeds: [errorEmbed],
      });
    }
  },
});
