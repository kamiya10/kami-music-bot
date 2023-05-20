const { EmbedBuilder, SlashCommandBuilder, SlashCommandIntegerOption } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("jump")
    .setNameLocalization("zh-TW", "跳至")
    .setDescription("Jump to specific index in queue.")
    .setDescriptionLocalization("zh-TW", "跳至指定編號。")
    .addIntegerOption(new SlashCommandIntegerOption()
      .setName("index")
      .setNameLocalization("zh-TW", "編號")
      .setDescription("The index to jump to.")
      .setDescriptionLocalization("zh-TW", "要跳至播放清單的中的編號")
      .setMinValue(1)
      .setRequired(true))
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

      if (index > (GuildMusicPlayer.queue.length - 1)) throw { message: "ERR_OUT_OF_BOUNDS" };
      GuildMusicPlayer.play(index);

      const sent = await interaction.editReply({ content: `▶ \`#${GuildMusicPlayer.currentIndex + 1}\` ${GuildMusicPlayer.current.title}` });
      setTimeout(async () => await sent.delete(), 10_000);
    } catch (e) {
      const errCase = {
        ERR_USER_NOT_IN_VOICE      : "你必須在語音頻道內才能使用這個指令",
        ERR_USER_NOT_IN_SAME_VOICE : "你和我在同一個語音頻道內才能使用這個指令",
        ERR_NO_PLAYER              : "現在沒有在放音樂",
        ERR_PLAYER_LOCKED          : "你沒有權限和這個播放器互動",
        ERR_OUT_OF_BOUNDS          : "你不可以跳到不存在的編號",
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