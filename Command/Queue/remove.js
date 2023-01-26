const { EmbedBuilder, SlashCommandBuilder, SlashCommandSubcommandBuilder, SlashCommandIntegerOption } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setNameLocalization("zh-TW", "移除")
    .setDescription("Remove songs from the queue.")
    .setDescriptionLocalization("zh-TW", "從播放清單中移除歌曲")
    .addSubcommand(new SlashCommandSubcommandBuilder()
      .setName("index")
      .setNameLocalization("zh-TW", "編號")
      .setDescription("Remove songs by index")
      .setDescriptionLocalization("zh-TW", "依編號移除歌曲")
      .addIntegerOption(new SlashCommandIntegerOption()
        .setName("index")
        .setNameLocalization("zh-TW", "編號")
        .setDescription("The index to remove from the queue.")
        .setDescriptionLocalization("zh-TW", "要刪除的編號")
        .setMinValue(1)
        .setRequired(true)))
    .setDMPermission(false),
  defer     : true,
  ephemeral : false,

  /**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
  async execute(interaction) {
    try {
      if (!interaction.member.voice.channel) throw { message: "ERR_USER_NOT_IN_VOICE" };
      const GuildMusicPlayer = interaction.client.players.get(interaction.guild.id);

      if (!GuildMusicPlayer) throw { message: "ERR_NO_PLAYER" };

      if (GuildMusicPlayer.locked && GuildMusicPlayer.owner.id != interaction.member.id) throw { message: "ERR_PLAYER_LOCKED" };

      if (GuildMusicPlayer.voiceChannel.id != interaction.member.voice.channel.id)
        throw "ERR_USER_NOT_IN_SAME_VOICE";

      const index = interaction.options.getInteger("index") - 1;

      const resource = GuildMusicPlayer.removeIndex(index);

      await interaction.editReply({ content: `🚮 \`#${GuildMusicPlayer.currentIndex + 1}\` ${resource.title}` });
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

      if (this.defer)
        if (!this.ephemeral)
          await interaction.deleteReply().catch(() => void 0);
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  },
};