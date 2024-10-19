import { Colors, EmbedBuilder, SlashCommandBuilder, hyperlink } from 'discord.js';
import { KamiCommand } from '@/core/command';

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('next')
    .setDescription('Play next resource'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `下一個 | ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL() ?? undefined,
      });

    const edit = () => interaction.editReply({
      embeds: [embed],
    });

    const player = this.players.get(interaction.guild.id);

    if (!player) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 伺服器內沒有播放器');

      await edit();
      return;
    }

    if (!player.canInteract(interaction.member)) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 你沒有權限和這個播放器互動');

      await edit();
      return;
    }

    const resource = player.forward();

    if (!resource) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 沒有下一個項目了');

      await edit();
      return;
    }

    const link = hyperlink(resource.title, resource.url);

    embed
      .setColor(Colors.Green)
      .setDescription(`⏩ #${player.currentIndex + 1} ${link}`);

    await edit();
  },
});
