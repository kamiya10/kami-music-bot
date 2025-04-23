import { Colors, EmbedBuilder, SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, hyperlink, unorderedList } from 'discord.js';
import { eq, inArray } from 'drizzle-orm';

import { KamiMusicPlayer } from '@/core/player';
import { KamiResource } from '@/core/resource';
import { KamiSubcommand } from '@/core/command';
import Logger from '@/utils/logger';
import { db } from '@/database';
import { deferEphemeral } from '@/utils/callback';
import { playlist } from '@/database/schema';
import { resource } from '@/database/schema/resource';

const nameOption = new SlashCommandStringOption()
  .setName('name')
  .setNameLocalization('zh-TW', '名稱')
  .setDescription('Name of the playlist to add from')
  .setDescriptionLocalization('zh-TW', '要加入的播放清單名稱')
  .setRequired(true)
  .setAutocomplete(true);

const startOption = new SlashCommandIntegerOption()
  .setName('start')
  .setNameLocalization('zh-TW', '起始')
  .setDescription('Start index of the range (1-based)')
  .setDescriptionLocalization('zh-TW', '範圍起始位置（從1開始）')
  .setRequired(false)
  .setMinValue(1);

const endOption = new SlashCommandIntegerOption()
  .setName('end')
  .setNameLocalization('zh-TW', '結束')
  .setDescription('End index of the range (1-based)')
  .setDescriptionLocalization('zh-TW', '範圍結束位置（從1開始）')
  .setRequired(false)
  .setMinValue(1);

const beforeOption = new SlashCommandIntegerOption()
  .setName('before')
  .setNameLocalization('zh-TW', '位置')
  .setDescription('Put resources before this position (Insert at first: 1, leave empty to insert at last)')
  .setDescriptionLocalization('zh-TW', '資源加入的位置（最前端 = 1 ，留空來將資源加到播放佇列的最尾端）')
  .setRequired(false)
  .setMinValue(1);

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('playlist')
    .setNameLocalization('zh-TW', '播放清單')
    .setDescription('Add songs from a playlist to the queue')
    .setDescriptionLocalization('zh-TW', '從播放清單加入歌曲到佇列')
    .addStringOption(nameOption)
    .addIntegerOption(startOption)
    .addIntegerOption(endOption)
    .addIntegerOption(beforeOption),

  async execute(interaction) {
    await deferEphemeral(interaction);

    const guild = interaction.guild;
    const member = interaction.member;

    const text = interaction.channel;
    const voice = interaction.member.voice.channel;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `新增 | ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL()!,
      });

    const edit = () => interaction.editReply({
      embeds: [embed],
    });

    if (!voice || !text) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 你需要在語音頻道內才能使用這個指令');

      await edit();
      return;
    }

    let player = this.players.get(guild.id);

    if (!player) {
      player = new KamiMusicPlayer(
        this,
        member,
        text,
        voice,
      );
      this.players.set(guild.id, player);
    }

    const inSameVoiceChannel = player.voice.id == voice.id;

    if (!player.canInteract(interaction.member) || !inSameVoiceChannel) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 你沒有權限和這個播放器互動');

      await edit();
      return;
    }

    const playlistName = interaction.options.getString('name', true);
    const start = interaction.options.getInteger('start');
    const end = interaction.options.getInteger('end');
    const before = interaction.options.getInteger('before');

    try {
      // Get the playlist
      const playlistData = await db.query.playlist.findFirst({
        where: (playlist, { and }) => and(
          eq(playlist.name, playlistName),
          eq(playlist.ownerId, interaction.user.id),
        ),
      });

      if (!playlistData) {
        embed
          .setColor(Colors.Red)
          .setDescription('❌ 找不到播放清單');

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      // Get the resources
      const resources = (await db.query.resource.findMany({
        where: inArray(resource.resourceId, playlistData.resources),
      })).map((r) => new KamiResource(this, r));

      if (resources.length === 0) {
        embed
          .setColor(Colors.Red)
          .setDescription('❌ 播放清單中沒有任何歌曲');

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      let startIndex = start ? start - 1 : 0;
      let endIndex = end ? end - 1 : resources.length - 1;

      if (startIndex >= resources.length || endIndex >= resources.length) {
        embed
          .setColor(Colors.Red)
          .setDescription(`❌ 無效的範圍（須介於 1 至 ${resources.length}）`);

        await interaction.editReply({ embeds: [embed] });
        return;
      }

      if (startIndex > endIndex) {
        [startIndex, endIndex] = [endIndex, startIndex];
      }

      const selectedResources = resources.slice(startIndex, endIndex + 1);

      const insertIndex = before ? before - 1 : player.queue.length;
      await player.addResource(selectedResources, insertIndex);

      if (selectedResources.length === 1) {
        embed
          .setColor(Colors.Green)
          .setDescription(`✅ 已將「${hyperlink(selectedResources[0].title, selectedResources[0].url)}」加入播放佇列`);
      }
      else {
        const description: string[] = selectedResources
          .slice(0, 5)
          .map((v) => hyperlink(v.title, v.url));

        if (selectedResources.length > 5) {
          description.push(`...還有 ${selectedResources.length - 5} 個項目`);
        }

        embed
          .setColor(Colors.Green)
          .setDescription(`✅ 已將 ${selectedResources.length} 個項目加入至播放佇列\n${unorderedList(description)}`)
          .setThumbnail(selectedResources[0].thumbnail);
      }

      await interaction.editReply({ embeds: [embed] });
    }
    catch (error) {
      Logger.error('Failed to add playlist to queue', error);

      embed
        .setColor(Colors.Red)
        .setDescription('❌ 新增歌曲失敗，請稍後再試');

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
