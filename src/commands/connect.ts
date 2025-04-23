import { Colors, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';

import { KamiCommand } from '@/core/command';
import { KamiMusicPlayer } from '@/core/player';

export default new KamiCommand({
  builder: new SlashCommandBuilder()
    .setName('connect')
    .setNameLocalization('ja', '接続')
    .setNameLocalization('zh-TW', '加入語音')
    .setDescription('Connect to the voice channel you currently in.')
    .setDescriptionLocalization('ja', '現在いるボイスチャンネルに接続する')
    .setDescriptionLocalization('zh-TW', '嘗試讓機器人加入語音頻道，當機器人突然離開語音頻道時可以用這個指令'),
  async execute(interaction) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const guild = interaction.guild;
    const member = interaction.member;

    const text = interaction.channel;
    const voice = interaction.member.voice.channel;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `加入語音 | ${interaction.guild.name}`,
        iconURL: interaction.guild.iconURL() ?? undefined,
      });

    if (!voice || !text) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 你需要在語音頻道內才能使用這個指令');

      void interaction.editReply({
        embeds: [embed],
      });
      return;
    }

    const player = this.players.get(guild.id);

    if (!player) {
      this.players.set(
        guild.id,
        new KamiMusicPlayer(
          this,
          member,
          text,
          voice,
        ),
      );

      embed
        .setColor(Colors.Green)
        .setDescription(`📥 已加入 ${voice}`);

      await interaction.editReply({
        embeds: [embed],
      });
      return;
    }

    const isMemberPlayerOwner = player.locked && player.owner.id == member.id;
    const isMemberVoiceSameAsPlayerVoice = player.voice.id == voice.id;

    if (!isMemberPlayerOwner && !isMemberVoiceSameAsPlayerVoice) {
      embed
        .setColor(Colors.Red)
        .setDescription('❌ 你沒有權限和這個播放器互動');

      void interaction.editReply({
        embeds: [embed],
      });
      return;
    }

    player.connect(voice);

    embed
      .setColor(Colors.Green)
      .setDescription(isMemberVoiceSameAsPlayerVoice ? `🔄️ 已重新連接至 ${voice}` : `📥 已加入 ${voice}`);

    await interaction.editReply({
      embeds: [embed],
    });
  },
});
