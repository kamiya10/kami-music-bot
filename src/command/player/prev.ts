import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { Command } from "..";

export default {
  data: new SlashCommandBuilder()
    .setName("prev")
    .setNameLocalization("zh-TW", "上一首")
    .setDescription("Pause playback.")
    .setDescriptionLocalization("zh-TW", "播放上一首。")
    .setDMPermission(false),
  defer: true,
  ephemeral: false,

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      if (!interaction.member.voice.channel) {
        throw { message: "ERR_USER_NOT_IN_VOICE" };
      }

      const GuildMusicPlayer = interaction.client.players.get(
        interaction.guild.id
      );

      if (!GuildMusicPlayer) {
        throw { message: "ERR_NO_PLAYER" };
      }

      if (
        GuildMusicPlayer.locked &&
        GuildMusicPlayer.owner.id != interaction.member.id
      ) {
        throw { message: "ERR_PLAYER_LOCKED" };
      }

      if (
        GuildMusicPlayer.voiceChannel.id != interaction.member.voice.channel.id
      ) {
        throw "ERR_USER_NOT_IN_SAME_VOICE";
      }

      const resource = GuildMusicPlayer.prev();

      const sent = await interaction.editReply({
        content: `⏮ \`#${GuildMusicPlayer.currentIndex + 1}\` ${resource.title}`,
      });
      setTimeout(() => sent.delete().catch(() => void 0), 10_000);
    } catch (e) {
      const errCase = {
        ERR_USER_NOT_IN_VOICE: "你必須在語音頻道內才能使用這個指令",
        ERR_USER_NOT_IN_SAME_VOICE: "你和我在同一個語音頻道內才能使用這個指令",
        ERR_NO_PLAYER: "現在沒有在放音樂",
        ERR_PLAYER_LOCKED: "你沒有權限和這個播放器互動",
      }[e.message];

      const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setTitle(`❌ 錯誤`);

      if (!errCase) {
        embed
          .setDescription(`發生了預料之外的錯誤：\`${e.message}\``)
          .setFooter({ text: "ERR_UNCAUGHT_EXCEPTION" });
        console.error(e);
      } else {
        embed.setDescription(errCase).setFooter({ text: e.message });
      }

      if (this.defer) {
        if (!this.ephemeral) {
          await interaction.deleteReply().catch(() => void 0);
        }
      }

      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  },
} satisfies Command;
