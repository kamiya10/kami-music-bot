import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

import { Colors, EmbedBuilder, MessageFlags, SlashCommandAttachmentOption, SlashCommandIntegerOption, SlashCommandSubcommandBuilder } from 'discord.js';

import { KamiResource, Platform } from '@/core/resource';
import { KamiMusicPlayer } from '@/core/player';
import { KamiSubcommand } from '@/core/command';
import Logger from '@/utils/logger';

const fileOption = new SlashCommandAttachmentOption()
  .setName('file')
  .setNameLocalization('zh-TW', '檔案')
  .setDescription('The audio file to add (Max: 8MB)')
  .setDescriptionLocalization('zh-TW', '要播放的音訊檔案（最大： 8MB ）')
  .setRequired(true);

const beforeOption = new SlashCommandIntegerOption()
  .setName('before')
  .setNameLocalization('zh-TW', '位置')
  .setDescription('Put this resource before. (Insert at first: 1, leave empty to insert at last)')
  .setDescriptionLocalization('zh-TW', '資源加入的位置（最前端 = 1 ，留空來將資源加到播放佇列的最尾端）')
  .setMinValue(1);

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('file')
    .setNameLocalization('zh-TW', '檔案')
    .setDescription('Add an audio file to the queue')
    .setDescriptionLocalization('zh-TW', '新增音訊檔案到播放佇列')
    .addAttachmentOption(fileOption)
    .addIntegerOption(beforeOption),

  async execute(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

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

    const file = interaction.options.getAttachment('file', true);
    const title = file.name;
    const before = interaction.options.getInteger('before') ?? undefined;

    if (!file.contentType?.startsWith('audio/')) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 請上傳有效的音訊檔案');

      await edit();
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 音訊檔案大小不能超過 8 MB');

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

    try {
      const response = await fetch(file.url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileId = createHash('md5').update(buffer).digest('hex');
      const tempPath = join(player.tempFolderPath, fileId);

      writeFileSync(tempPath, buffer);

      const resource = new KamiResource(
        this,
        {
          type: Platform.File,
          id: fileId,
          title: title,
          length: 0,
          url: file.url,
          thumbnail: 'https://i.imgur.com/PBNp7QM.png',
        })
        .setMember(interaction.member)
        .setCache(tempPath);

      await player.addResource(resource, before);

      embed
        .setColor(Colors.Green)
        .setDescription(`✅ ${title} 已加到播放佇列`)
        .setThumbnail(resource.thumbnail);

      Logger.debug(`Added file resource ${resource} to player ${player.guild.id}`);
    }
    catch (error) {
      embed
        .setColor(Colors.Red)
        .setDescription(`❌ 處理檔案時發生錯誤：${error instanceof Error ? error.message : String(error)}`);

      Logger.error('Error while processing file', error);
    }

    await edit();
  },
});
