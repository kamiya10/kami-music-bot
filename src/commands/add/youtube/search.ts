import { Collection, Colors, EmbedBuilder, SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, hyperlink } from 'discord.js';
import { fetchVideo, searchVideo } from '@/api/youtube';
import { KamiMusicPlayer } from '@/core/player';
import { KamiResource } from '@/core/resource';
import { KamiSubcommand } from '@/core/command';
import { logError } from "@/utils/callback";

const inputOption = new SlashCommandStringOption()
  .setName('video')
  .setDescription('Search and select a video to add to the queue')
  .setAutocomplete(true)
  .setRequired(true);

const beforeOption = new SlashCommandIntegerOption()
  .setName('before')
  .setDescription('Put this resource before. (Insert at first: 1, leave empty to insert at last)')
  .setMinValue(1);

const cache = new Collection<string, Timer>();

export default new KamiSubcommand({
  builder: new SlashCommandSubcommandBuilder()
    .setName('search')
    .setDescription('Add videos from YouTube by search')
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

    if (!player.canInteract(interaction.member) && !inSameVoiceChannel) {
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
        player.addResource(resource, before);

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
  onAutocomplete(interaction) {
    const keyword = interaction.options.getFocused();
      
    const respond = async () => {
      const result = await searchVideo(keyword).catch(logError) ?? [];

      const choice = result.map((v) => ({
        name: v.title,
        value:v.id,
      }))

      await interaction.respond(choice).catch(logError);
      cache.delete(interaction.guild.id);
    };

      if (cache.has(interaction.guild.id)) {
        clearTimeout(cache.get(interaction.guild.id));
        cache.delete(interaction.guild.id);
      }
      
      cache.set(
        interaction.guild.id,
        setTimeout(respond, 1_500),
      );
  },
});
