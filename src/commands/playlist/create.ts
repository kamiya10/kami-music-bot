import { EmbedBuilder, SlashCommandBooleanOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, bold } from 'discord.js';
import { nanoid } from 'nanoid';

import { KamiResource, Platform } from '@/core/resource';
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
    .setNameLocalization('ja', '作成')
    .setNameLocalization('zh-TW', '建立')
    .setDescription('Create a new playlist')
    .setDescriptionLocalization('ja', '新しいプレイリストを作成する')
    .setDescriptionLocalization('zh-TW', '建立新的播放清單')
    .addStringOption(new SlashCommandStringOption()
      .setName('name')
      .setNameLocalization('ja', '名前')
      .setNameLocalization('zh-TW', '名稱')
      .setDescription('Name of the playlist')
      .setDescriptionLocalization('ja', 'プレイリストの名前')
      .setDescriptionLocalization('zh-TW', '播放清單名稱')
      .setMaxLength(100)
      .setRequired(true),
    )
    .addBooleanOption(new SlashCommandBooleanOption()
      .setName('save_queue')
      .setNameLocalization('ja', 'キューを保存')
      .setNameLocalization('zh-TW', '保存佇列')
      .setDescription('Save current queue to the playlist')
      .setDescriptionLocalization('ja', '現在のキューをプレイリストに保存する')
      .setDescriptionLocalization('zh-TW', '保存目前佇列到播放清單')
      .setRequired(false),
    ),

  async execute(interaction) {
    await deferEphemeral(interaction);

    const name = interaction.options.getString('name', true);
    const saveQueue = interaction.options.getBoolean('save_queue') ?? false;

    const existingPlaylist = await db.query.playlist.findFirst({
      where: (playlist, { and, eq }) => and(
        eq(playlist.name, name),
        eq(playlist.ownerId, interaction.user.id),
      ),
    });

    if (existingPlaylist) {
      const errorEmbed = user(interaction)
        .error(`播放清單的名稱不能重複`)
        .embed;

      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    const resources: string[] = [];
    const embeds: EmbedBuilder[] = [];

    if (saveQueue && interaction.guildId) {
      const queue = getQueue(interaction.guildId);

      if (queue?.resources) {
        const validResources = queue.resources.filter((resource: KamiResource) => resource.type !== Platform.File);

        if (validResources.length < queue.resources.length) {
          const warnEmbed = user(interaction)
            .warn('自定音檔將不會被加入至播放清單')
            .embed;

          embeds.push(warnEmbed);
        }

        resources.push(...validResources.map((resource: KamiResource) => `${resource.id}@${resource.type}`));
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

      embeds.push(successEmbed);

      await interaction.editReply({ embeds });
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
