const { EmbedBuilder, SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandIntegerOption } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setNameLocalization("zh-TW", "音量")
    .setDescription("Set playback volume.")
    .setDescriptionLocalization("zh-TW", "設定播放音量。")
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName("percentage")
      .setNameLocalization("zh-TW", "百分比")
      .setDescription("Set playback volume in percentage.")
      .setDescriptionLocalization("zh-TW", "使用百分比來設定播放音量。")
      .addIntegerOption(new SlashCommandIntegerOption()
        .setName("value")
        .setNameLocalization("zh-TW", "值")
        .setDescription("The percentage to set to.")
        .setDescriptionLocalization("zh-TW", "要設定的百分比。")
        .setMinValue(0)
        .setRequired(true)))
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName("decibels")
      .setNameLocalization("zh-TW", "分貝")
      .setDescription("Set playback volume in decibels.")
      .setDescriptionLocalization("zh-TW", "使用分貝數來設定播放音量。")
      .addIntegerOption(new SlashCommandIntegerOption()
        .setName("value")
        .setNameLocalization("zh-TW", "值")
        .setDescription("The decibels to set to.")
        .setDescriptionLocalization("zh-TW", "要設定的分貝數。")
        .setMinValue(0)
        .setRequired(true)))
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName("log")
      .setNameLocalization("zh-TW", "對數")
      .setDescription("Set playback volume in a logarithmic scale percentage.")
      .setDescriptionLocalization("zh-TW", "使用對數百分比來設定播放音量。")
      .addIntegerOption(new SlashCommandIntegerOption()
        .setName("value")
        .setNameLocalization("zh-TW", "值")
        .setDescription("The percentage to set to.")
        .setDescriptionLocalization("zh-TW", "要設定的百分比。")
        .setMinValue(0)
        .setRequired(true)))
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

      const type = interaction.options.getSubcommand();
      const value = interaction.options.getInteger("value");

      let volumeString = "";

      if (value) {
        switch (type) {
          case "percentage": {
            GuildMusicPlayer.volume = value / 100;
            volumeString = `**${value}%** → ${GuildMusicPlayer.volume}${GuildMusicPlayer.volume > 10 ? "*爆音啦～～～*" : ""}`;
            break;
          }

          case "decibels": {
            GuildMusicPlayer.volume = Math.pow(10, value / 20) / 100;
            volumeString = `**${value}dB** → ${GuildMusicPlayer.volume}`;
            break;
          }

          case "log": {
            GuildMusicPlayer.volume = Math.pow(4 * value / 25, 1.660964) / 100;
            volumeString = `**${value}%log** → ${GuildMusicPlayer.volume}`;
            break;
          }

          default: break;
        }
      } else {
        GuildMusicPlayer.volume = 0;
      }

      const volumeIcon = (GuildMusicPlayer.volume == 0) ? "🔇"
        : (GuildMusicPlayer.volume >= 0.5) ? "🔊"
          : (GuildMusicPlayer.volume >= 0.25) ? "🔉"
            : "🔈";

      await interaction.editReply({ content: `${volumeIcon} ${volumeString}` });
    } catch (e) {
      const errCase = {
        ERR_USER_NOT_IN_VOICE      : "你必須在語音頻道內才能使用這個指令",
        ERR_USER_NOT_IN_SAME_VOICE : "你和我在同一個語音頻道內才能使用這個指令",
        ERR_NO_PLAYER              : "現在沒有在放音樂",
        ERR_PLAYER_LOCKED          : "你沒有權限和這個播放器互動",
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