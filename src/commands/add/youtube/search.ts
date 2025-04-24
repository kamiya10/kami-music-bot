import { Collection, Colors, EmbedBuilder, MessageFlags, SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, hyperlink } from 'discord.js';

import { fetchVideo, searchVideo } from '@/api/youtube';
import { KamiMusicPlayer } from '@/core/player';
import { KamiResource } from '@/core/resource';
import { KamiSubcommand } from '@/core/command';
import { logError } from '@/utils/callback';

const inputOption = new SlashCommandStringOption()
  .setName('video')
  .setNameLocalization('ja', '動画')
  .setNameLocalization('zh-TW', '影片')
  .setDescription('Search and select a video to add to the queue')
  .setDescriptionLocalization('ja', '動画を検索して再生キューに追加する')
  .setDescriptionLocalization('zh-TW', '搜尋並選擇影片來新增資源到播放佇列中')
  .setMinLength(4)
  .setAutocomplete(true)
  .setRequired(true);

const beforeOption = new SlashCommandIntegerOption()
  .setName('before')
  .setNameLocalization('ja', '位置')
  .setNameLocalization('zh-TW', '位置')
  .setDescription('Put this resource before. (Insert at first: 1, leave empty to insert at last)')
  .setDescriptionLocalization('ja', 'リソースを指定位置の前に追加する（最初: 1、空欄で最後に追加）')
  .setDescriptionLocalization('zh-TW', '資源加入的位置（最前端 = 1 ，留空來將資源加到播放佇列的最尾端）')
  .setMinValue(1);

const cache = new Collection<string, NodeJS.Timeout>();

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('search')
    .setNameLocalization('ja', '検索')
    .setNameLocalization('zh-TW', '搜尋')
    .setDescription('Add videos from YouTube by search')
    .setDescriptionLocalization('ja', 'YouTube検索で動画を追加する')
    .setDescriptionLocalization('zh-TW', '依 YouTube 搜尋結果新增資源到播放佇列')
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

    const videoId = interaction.options.getString('video', true);
    const before = interaction.options.getInteger('before') ?? undefined;

    try {
      const video = await fetchVideo(videoId);

      if (!video.duration) {
        embed
          .setColor(Colors.Red)
          .setDescription('❌ 無效的 YouTube 影片（未公開或尚未上映）');

        await edit();
        return;
      }

      const resource = KamiResource.youtube(this, video).setMember(interaction.member);
      await player.addResource(resource, before);

      embed
        .setColor(Colors.Green)
        .setDescription(`✅ ${hyperlink(resource.title, resource.url)} 已加到播放佇列`)
        .setThumbnail(video.thumbnail.url);
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
  async onAutocomplete(interaction) {
    const keyword = interaction.options.getFocused();

    if (keyword.length < 4) {
      await interaction.respond([]).catch(logError);
      return;
    }

    const respond = async () => {
      const result = await searchVideo(keyword).catch(logError) ?? [];

      const choice = result.map((v) => ({
        name: v.title,
        value: v.id,
      }));

      await interaction.respond(choice).catch(logError);
      cache.delete(interaction.guild.id);
    };

    if (cache.has(interaction.guild.id)) {
      clearTimeout(cache.get(interaction.guild.id));
      cache.delete(interaction.guild.id);
    }

    cache.set(
      interaction.guild.id,
      setTimeout(() => void respond(), 1_500),
    );
  },
});
