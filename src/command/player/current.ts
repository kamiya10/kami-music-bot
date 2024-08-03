import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { Command } from "..";

export default {
  data: new SlashCommandBuilder()
    .setName("current")
    .setNameLocalization("zh-TW", "目前播放")
    .setDescription("Display the song that is currently playing.")
    .setDescriptionLocalization("zh-TW", "顯示目前正在播放的項目。")
    .setDMPermission(false),
  defer: true,
  ephemeral: true,

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      /**
       * @type {import("../../Class/KamiMusicPlayer").KamiMusicPlayer}
       */
      const GuildMusicPlayer = interaction.client.players.get(
        interaction.guild.id
      );

      if (!GuildMusicPlayer) {
        throw { message: "ERR_NO_PLAYER" };
      }

      const resource = GuildMusicPlayer._resource;
      let embed = new EmbedBuilder()
        .setColor(interaction.client.Color.Info)
        .setAuthor({
          name: `正在播放 | ${interaction.guild.name}`,
          iconURL: interaction.guild.iconURL(),
        })
        .setTimestamp();

      if (resource) {
        const progress = playbackBar(
          ~~(GuildMusicPlayer.playbackTime / 1000),
          GuildMusicPlayer.current.duration
        );

        embed = embed
          .setThumbnail(GuildMusicPlayer.current.thumbnail)
          .setTitle(GuildMusicPlayer.current.title)
          .setURL(GuildMusicPlayer.current.url)
          .setDescription(
            `${GuildMusicPlayer.formattedPlaybackTime} ${progress} ${GuildMusicPlayer.current.formattedDuration}`
          );
      } else {
        embed = embed.setDescription("目前沒有在播放任何東西");
      }

      const sent = await interaction.editReply({
        embeds: [embed],
        ephemeral: true,
      });
      setTimeout(() => sent.delete().catch(() => void 0), 30_000);
    } catch (e) {
      const errCase = {
        ERR_USER_NOT_IN_VOICE: "你必須在語音頻道內才能使用這個指令",
        ERR_USER_NOT_IN_SAME_VOICE: "你和我在同一個語音頻道內才能使用這個指令",
        ERR_NO_PLAYER: "現在沒有在放音樂",
      }[e.message];

      const embed = new EmbedBuilder()
        .setColor(interaction.client.Color.Error)
        .setTitle(`${interaction.client.EmbedIcon.Error} 錯誤`);

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

function playbackBar(time, total) {
  const playBackBarLocation = Math.round((time / total) * 10);
  let playBack = "";

  for (let i = 1; i < 11; i++) {
    if (playBackBarLocation == 0) {
      playBack = ":radio_button:　　　　　　　　　";
      break;
    } else if (playBackBarLocation == 10) {
      playBack = "　　　　　　　　　:radio_button:";
      break;
    } else if (i == playBackBarLocation) {
      playBack = playBack + ":radio_button:";
    } else {
      playBack = playBack + "　";
    }
  }

  return `~~​${playBack}​~~`;
}
