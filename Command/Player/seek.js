const { EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("seek")
    .setNameLocalization("zh-TW", "快轉")
    .setDescription("Seek to a specific position of a track.")
    .setDescriptionLocalization("zh-TW", "快轉到音軌上的某個位置。")
    .addStringOption(new SlashCommandStringOption()
      .setName("position")
      .setNameLocalization("zh-TW", "位置")
      .setDescription("The position to seek to. (format: MM:SS, HH:MM:SS, S)")
      .setDescriptionLocalization("zh-TW", "要快轉到的位置（格式：MM:SS, HH:MM:SS, S）")
      .setRequired(true))
    .setDMPermission(false),
  defer     : true,
  ephemeral : false,

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      if (!interaction.member.voice.channel) {
        throw { message: "ERR_USER_NOT_IN_VOICE" };
      }

      /**
       * @type {import("../../Class/KamiMusicPlayer").KamiMusicPlayer}
       */
      const GuildMusicPlayer = interaction.client.players.get(interaction.guild.id);

      if (!GuildMusicPlayer) {
        throw { message: "ERR_NO_PLAYER" };
      }

      if (GuildMusicPlayer.locked && GuildMusicPlayer.owner.id != interaction.member.id) {
        throw { message: "ERR_PLAYER_LOCKED" };
      }

      if (GuildMusicPlayer.voiceChannel.id != interaction.member.voice.channel.id) {
        throw "ERR_USER_NOT_IN_SAME_VOICE";
      }

      const resource = GuildMusicPlayer._resource;
      let content = "";

      if (resource) {
        const time = parseTime(interaction.options.getString("position"));

        if (time != null) {
          GuildMusicPlayer.pause();
          GuildMusicPlayer.play(undefined, time * 1000);
          content = `⤵️ ${formatTime(time)}`;
        } else {
          throw "ERR_FORMAT";
        }
      } else {
        content = "❌ 目前沒有在播放任何東西";
      }

      const sent = await interaction.editReply({ content });
      setTimeout(() => sent.delete().catch(() => void 0), 10_000);
    } catch (e) {
      const errCase = {
        ERR_USER_NOT_IN_VOICE      : "你必須在語音頻道內才能使用這個指令",
        ERR_USER_NOT_IN_SAME_VOICE : "你和我在同一個語音頻道內才能使用這個指令",
        ERR_NO_PLAYER              : "現在沒有在放音樂",
        ERR_PLAYER_LOCKED          : "你沒有權限和這個播放器互動",
        ERR_FORMAT                 : "格式錯誤，必須是 `HH:MM:SS`, `h:m:s`, `MM:SS`, `m:s` 或 `s` 其中一種",
      }[e.message];

      const embed = new EmbedBuilder()
        .setColor(interaction.client.Color.Error)
        .setTitle(`${interaction.client.EmbedIcon.Error} 錯誤`);

      if (!errCase) {
        embed.setDescription(`發生了預料之外的錯誤：\`${e.message}\``)
          .setFooter({ text: "ERR_UNCAUGHT_EXCEPTION" });
        console.error(e);
      } else {
        embed.setDescription(errCase)
          .setFooter({ text: e.message });
      }

      if (this.defer) {
        if (!this.ephemeral) {
          await interaction.deleteReply().catch(() => void 0);
        }
      }

      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  },
};

function parseTime(time) {
  if (time.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/)) {
    const [, hour, minute, second] = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(time);
    return +hour * 3600 + +minute * 60 + +second;
  } else if (time.match(/^(\d{1,2}):(\d{1,2})$/)) {
    const [, minute, second] = /^(\d{1,2}):(\d{1,2})$/.exec(time);
    return +minute * 60 + +second;
  } else if (time.match(/^(\d+)$/)) {
    const [, second] = /^(\d+)$/.exec(time);
    return +second;
  } else {
    return null;
  }
}

function formatTime(seconds, forceHours) {
  let str = "";
  const second = ~~(seconds % 60);
  const minute = ~~(seconds / 60);
  const hour = ~~(minute / 60);

  if (forceHours) {
    str += `${hour.toString().padStart(2, "0")}:`;
    str += `${minute.toString().padStart(2, "0")}:`;
  } else if (hour) {
    str += `${hour}:`;
    str += `${minute.toString().padStart(2, "0")}:`;
  } else {
    str += `${minute}:`;
  }

  str += `${second.toString().padStart(2, "0")}`;

  return str;
}