import { Colors, EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import { nanoid } from 'nanoid';

import { KamiResource } from '@/core/resource';
import { KamiSubcommand } from '@/core/command';
import { db } from '@/database';
import { deferEphemeral } from '@/utils/callback';
import { getQueue } from '@/core/queue';
import { playlist } from '@/database/schema/playlist';

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('create')
    .setNameLocalization('zh-TW', '建立')
    .setDescription('Create a new playlist')
    .setDescriptionLocalization('zh-TW', '建立新的播放清單')
    .addStringOption((option) =>
      option
        .setName('name')
        .setNameLocalization('zh-TW', '名稱')
        .setDescription('Name of the playlist')
        .setDescriptionLocalization('zh-TW', '播放清單名稱')
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName('save_queue')
        .setNameLocalization('zh-TW', '保存佇列')
        .setDescription('Save current queue to the playlist')
        .setDescriptionLocalization('zh-TW', '保存目前佇列到播放清單')
        .setRequired(false),
    ),
  async execute(interaction) {
    const name = interaction.options.getString('name', true);
    const saveQueue = interaction.options.getBoolean('save_queue') ?? false;

    await deferEphemeral(interaction);

    const resources: string[] = [];
    if (saveQueue && interaction.guildId) {
      const queue = getQueue(interaction.guildId);
      if (queue?.resources) {
        resources.push(...queue.resources.map((resource: KamiResource) => resource.id));
      }
    }

    const id = nanoid();
    try {
      await db.insert(playlist).values({
        id,
        name,
        resources,
        ownerId: interaction.user.id,
      });

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setAuthor({
          name: `播放清單 | ${interaction.guild.name}`,
          iconURL: interaction.guild.iconURL() ?? undefined,
        })
        .setDescription(`✅ 已建立播放清單 "${name}" ${saveQueue ? '並加入目前的播放佇列' : ''}`)
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });
    }
    catch (error) {
      const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setAuthor({
          name: `播放清單 | ${interaction.guild.name}`,
          iconURL: interaction.guild.iconURL() ?? undefined,
        })
        .setDescription('❌ 建立播放清單失敗，請稍後再試')
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });
    }
  },
});
