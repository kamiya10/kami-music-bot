import { Colors, EmbedBuilder, SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, hyperlink, unorderedList } from 'discord.js';

import { fetchPlaylist, fetchVideo, parseUrl } from '@/api/youtube';
import { KamiMusicPlayer } from '@/core/player';
import { KamiResource } from '@/core/resource';
import { KamiSubcommand } from '@/core/command';

const inputOption = new SlashCommandStringOption()
  .setName('input')
  .setDescription('The Watch URL/Video ID/Playlist URL/Playlist ID of the resource')
  .setRequired(true);

const beforeOption = new SlashCommandIntegerOption()
  .setName('before')
  .setDescription('Put this resource before. (Insert at first: 1, leave empty to insert at last)')
  .setMinValue(1);

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('url')
    .setDescription('Add videos from YouTube with url')
    .addStringOption(inputOption)
    .addIntegerOption(beforeOption),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

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

    const ids = parseUrl(input);

    if (ids.playlist == null && ids.video == null) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 無效的 YouTube 連結');

      await edit();
      return;
    }

    try {
      if (ids.video) {
        const video = await fetchVideo(ids.video);

        if (!video.duration) {
          embed
            .setColor(Colors.Red)
            .setDescription('❌ 無效的 YouTube 連結（影片未公開或尚未上映）');

          await edit();
          return;
        }

        const resource = KamiResource.youtube(this, video).setMember(interaction.member);
        player.addResource(resource, before);

        embed
          .setColor(Colors.Green)
          .setDescription(`✅ ${hyperlink(resource.title, resource.url)} 已加到播放佇列`)
          .setThumbnail(video.thumbnail.url);
      }
      else if (ids.playlist) {
        const playlist = await fetchPlaylist(ids.playlist);

        const resources = playlist.videos
          .filter((v) => v.duration)
          .map((v) => KamiResource.youtube(this, v).setMember(interaction.member));

        player.addResource(resources, before);

        const description: string[] = resources
          .slice(0, 5)
          .map((v) => hyperlink(v.title, v.url));

        if (resources.length > 5) {
          description.push(`...還有 ${resources.length - 5} 個項目`);
        }

        embed
          .setColor(Colors.Green)
          .setTitle(playlist.title)
          .setURL(playlist.url)
          .setDescription(`✅ 已將 ${resources.length} 個項目新增至佇列\n${unorderedList(description)}`)
          .setThumbnail(playlist.thumbnail.url);
      }
    }
    catch (error) {
      embed
        .setColor(Colors.Red)
        .setDescription(`❌ 解析影片時發生錯誤：${error}`);
    }

    await interaction.editReply({
      embeds: [embed],
    });
  },
});
