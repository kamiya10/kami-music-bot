import { Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder, SlashCommandIntegerOption, hyperlink } from 'discord.js';

import { KamiCommand } from '@/core/command';

const indexOption = new SlashCommandIntegerOption()
  .setName('index')
  .setNameLocalization('zh-TW', '位置')
  .setDescription('The index of the resource to remove in the queue')
  .setDescriptionLocalization('zh-TW', '指定資源在佇列中的位置')
  .setMinValue(1)
  .setRequired(true);

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('remove')
    .setNameLocalization('zh-TW', '移除')
    .setDescription('Remove specific resource in the queue')
    .setDescriptionLocalization('zh-TW', '從播放佇列中移除指定資源')
    .addIntegerOption(indexOption),
  async execute(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `移除 | ${interaction.guild.name}`,
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

    const index = interaction.options.getInteger('index', true);

    if (index > player.queue.length) {
      embed
        .setColor(Colors.Red)
        .setDescription(`❌ 無效的索引值（須介於 1 至 ${player.queue.length}）`);

      await edit();
      return;
    }

    const resource = player.removeResource(index - 1);

    if (!resource) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 無效的索引值（指定的資源不存在）');

      await edit();
      return;
    }

    const link = hyperlink(resource.title, resource.url);

    embed
      .setColor(Colors.Green)
      .setDescription(`🚮 #${player.currentIndex + 1} ${link}`);

    await edit();
  },
});
