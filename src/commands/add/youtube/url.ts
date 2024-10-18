import { Colors, EmbedBuilder, SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, hyperlink } from "discord.js";
import { fetchPlaylist, fetchVideo, parseUrl } from "@/api/youtube";
import { KamiMusicPlayer } from "@/core/player";
import { KamiResource } from "@/core/resource";
import { KamiSubcommand } from "@/core/command";

import Logger from "@/utils/logger";

const inputOption = new SlashCommandStringOption()
  .setName("input")
  .setDescription("The Watch URL/Video ID/Playlist URL/Playlist ID of the resource")
  .setRequired(true);

const beforeOption = new SlashCommandIntegerOption()
  .setName("before")
  .setDescription("Put this resource before. (Insert at first: 1, leave empty to insert at last)")
  .setMinValue(1);

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName("url")
    .setDescription("Add videos from YouTube with url")
    .addStringOption(inputOption)
    .addIntegerOption(beforeOption),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;    
    const member = interaction.member;
    
    const text = interaction.channel;
    const voice = interaction.member.voice.channel;

    if (!voice || !text) {
      await interaction.editReply({
        content: "你需要在語音頻道內才能使用這個指令",
      });
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

    const isMemberPlayerOwner = player.locked && player.owner.id == member.id;
    const isMemberVoiceSameAsPlayerVoice = player.voice.id == voice.id;

    if (!isMemberPlayerOwner && !isMemberVoiceSameAsPlayerVoice) {
      await interaction.editReply({
        content: "你沒有權限和這個播放器互動",
      });
      return;
    }

    const input = interaction.options.getString("input", true);
    const before = interaction.options.getInteger("before") ?? undefined;

    const ids = parseUrl(input);
    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setAuthor({
        name    : `新增 | ${interaction.guild.name}`,
        iconURL : interaction.guild.iconURL()!,
      });
      
    if (ids.video) {
      const video = await fetchVideo(ids.video);
      Logger.debug(`Fetch ${ids.video}`, video);

      player.addResource(KamiResource.youtube(this, video), before);

      embed
        .setDescription(`🎵 ${hyperlink(video.title, video.url)} 已加到播放佇列`)
        .setThumbnail(video.thumbnail.url);
    }
    else if (ids.playlist) {
      const playlist = await fetchPlaylist(ids.playlist);

      const resources = playlist.videos.map(v => KamiResource.youtube(this, v));
      player.addResource(resources, before);

      embed
        .setTitle(playlist.title)
        .setURL(playlist.url)
        .setThumbnail(playlist.thumbnail.url);
    }
    else {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 無效的 YouTube 連結');
    }

    await interaction.editReply({
      embeds: [embed],
    });
  },
});