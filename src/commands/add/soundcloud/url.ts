import { Colors, EmbedBuilder, MessageFlags, SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, hyperlink } from 'discord.js';
import { SoundCloud as sc } from 'scdl-core';

import { KamiMusicPlayer } from '@/core/player';
import { KamiResource } from '@/core/resource';
import { KamiSubcommand } from '@/core/command';

await sc.connect();

const inputOption = new SlashCommandStringOption()
  .setName('input')
  .setNameLocalization('zh-TW', '連結')
  .setDescription('The SoundCloud track URL of the resource')
  .setDescriptionLocalization('zh-TW', '要新增至播放佇列的 SoundCloud 音軌連結')
  .setRequired(true);

const beforeOption = new SlashCommandIntegerOption()
  .setName('before')
  .setNameLocalization('zh-TW', '位置')
  .setDescription('Put this resource before. (Insert at first: 1, leave empty to insert at last)')
  .setDescriptionLocalization('zh-TW', '資源加入的位置（最前端 = 1 ，留空來將資源加到播放佇列的最尾端）')
  .setMinValue(1);

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('url')
    .setNameLocalization('zh-TW', '連結')
    .setDescription('Add tracks from SoundCloud with url')
    .setDescriptionLocalization('zh-TW', '依 SoundCloud 連結新增資源到播放佇列')
    .addStringOption(inputOption)
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

    const input = interaction.options.getString('input', true);
    const before = interaction.options.getInteger('before') ?? undefined;

    if (!input.startsWith('https://soundcloud.com/')) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 無效的 SoundCloud 連結');

      await edit();
      return;
    }

    try {
      const track = await sc.tracks.getTrack(input);

      if (!track.streamable) {
        embed
          .setColor(Colors.Red)
          .setDescription('❌ 無效的 SoundCloud 資源（無法串流）');

        await edit();
        return;
      }

      const resource = KamiResource.soundcloud(this, track).setMember(interaction.member);
      player.addResource(resource, before);

      embed
        .setColor(Colors.Green)
        .setDescription(`✅ ${hyperlink(resource.title, resource.url)} 已加到播放佇列`)
        .setThumbnail(track.artwork_url ?? '');
    }
    catch (error) {
      embed
        .setColor(Colors.Red)
        .setDescription(`❌ 解析音軌時發生錯誤：${error}`);
    }

    await interaction.editReply({
      embeds: [embed],
    });
  },
});
