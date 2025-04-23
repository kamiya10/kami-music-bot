import { Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';

import { KamiCommand } from '@/core/command';

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('clear')
    .setNameLocalization('ja', 'クリア')
    .setNameLocalization('zh-TW', '清除')
    .setDescription('Clears the player\'s queue')
    .setDescriptionLocalization('ja', 'プレイヤーのキューをクリアする')
    .setDescriptionLocalization('zh-TW', '清除播放器的播放佇列'),
  async execute(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

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

    if (!player.canInteract(interaction.member)) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 你沒有權限和這個播放器互動');

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
