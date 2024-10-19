import { Colors, EmbedBuilder, SlashCommandBuilder, inlineCode } from 'discord.js';
import { formatDuration, progress } from '@/utils/resource';
import { KamiCommand } from '@/core/command';

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('current')
    .setDescription('Display the current playing resource'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `正在播放 | ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL() ?? undefined,
      });

    const edit = () => interaction.editReply({
      embeds: [embed],
    });

    const player = this.players.get(interaction.guild.id);

    if (!player) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 沒有播放器');

      await edit();
      return;
    }

    const resource = player._currentResource;

    if (!resource) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 目前沒有正在播放的音樂');

      await edit();
      return;
    }

    const playback = resource.metadata.length
      ? [
        inlineCode(formatDuration(resource.playbackDuration)),
        progress((resource.playbackDuration / resource.metadata.length) * 100),
        inlineCode(resource.metadata.getLength()),
      ].join(' ')
      : 'LIVE';

    embed
      .setColor(Colors.Blue)
      .setTitle(resource.metadata.title)
      .setURL(resource.metadata.url)
      .setThumbnail(resource.metadata.thumbnail)
      .setDescription(playback);

    await edit();
  },
});
