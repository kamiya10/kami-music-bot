import { Colors, EmbedBuilder, SlashCommandBooleanOption, SlashCommandBuilder } from 'discord.js';

import { KamiCommand } from '@/core/command';

const stateOption = new SlashCommandBooleanOption()
  .setName('state')
  .setDescription('The state of the lock.');

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Toggle the lock state of the player.')
    .addBooleanOption(stateOption),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

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

    const state = interaction.options.getBoolean('state') ?? !player.locked;

    player.locked = state;

    const me = interaction.guild.members.me!;
    const name = me.displayName.replaceAll(/🔒\s?/g, '');

    await me.setNickname(`${state ? '🔒' : ''} ${name}`);

    embed
      .setColor(Colors.Green)
      .setDescription(
        state
          ? '🔒 已鎖定播放器，現在只有播放器擁有者可以和這個播放器互動。'
          : '🔓 已解鎖播放器，現在大家都可以和這個播放器互動。',
      );

    await edit();
  },
});
