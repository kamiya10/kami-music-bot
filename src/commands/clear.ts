import { Colors, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { KamiCommand } from '@/core/command';

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clears the player\'s queue'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `清除佇列 | ${interaction.guild.name}`,
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

    const count = player.clearResources().length;

    embed
      .setColor(Colors.Green)
      .setDescription(`✅ 已從佇列中刪除 ${count} 個項目`)
      .setTimestamp();

    await edit();
  },
});