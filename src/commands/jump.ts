import { Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder, SlashCommandIntegerOption, hyperlink } from 'discord.js';

import { KamiCommand } from '@/core/command';

const indexOption = new SlashCommandIntegerOption()
  .setName('index')
  .setNameLocalization('ja', '位置')
  .setDescription('The index of the resource in the queue to jump to')
  .setDescriptionLocalization('ja', 'ジャンプする曲の位置')
  .setMinValue(1)
  .setRequired(true);

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('jump')
    .setNameLocalization('ja', 'ジャンプ')
    .setNameLocalization('zh-TW', '跳至')
    .setDescription('Jump to specific index in the queue')
    .setDescriptionLocalization('ja', 'キュー内の特定の位置にジャンプする')
    .setDescriptionLocalization('zh-TW', '跳至播放佇列中的指定位置')
    .addIntegerOption(indexOption),
  async execute(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `跳至 | ${interaction.guild.name}`,
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

    const resource = await player.play(index - 1);

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
      .setDescription(`⤵️ #${player.currentIndex + 1} ${link}`);

    await edit();
  },
});
