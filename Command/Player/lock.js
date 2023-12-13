const { EmbedBuilder, SlashCommandBuilder, SlashCommandBooleanOption } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setNameLocalization("zh-TW", "鎖定")
    .setDescription("Make the player only listen to commands from its owner.")
    .setDescriptionLocalization("zh-TW", "鎖定播放器。讓播放器只接受播放器擁有者的指令。")
    .addBooleanOption(new SlashCommandBooleanOption()
      .setName("state")
      .setNameLocalization("zh-TW", "狀態")
      .setDescription("The lock state to set to.")
      .setDescriptionLocalization("zh-TW", "設定鎖定狀態"))
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

      if (GuildMusicPlayer.owner.id != interaction.member.id) {
        throw { message: "ERR_PERMISSION_DENIED" };
      }

      const state = interaction.options.getBoolean("state") ?? !GuildMusicPlayer.locked;
      GuildMusicPlayer.locked = state;

      const embed = new EmbedBuilder()
        .setColor(interaction.client.Color.Success)
        .setDescription(state ? "🔒 已鎖定播放器，現在只有播放器擁有者可以和這個播放器互動。" : "🔓 已解鎖播放器，現在大家都可以和這個播放器互動。");

      const sent = await interaction.editReply({ embeds: [embed] });
      setTimeout(() => sent.delete().catch(() => void 0), 10_000);
    } catch (e) {
      const errCase = {
        ERR_USER_NOT_IN_VOICE : "你必須在語音頻道內才能使用這個指令",
        ERR_NO_PLAYER         : "現在沒有在放音樂",
        ERR_PERMISSION_DENIED : "你沒有權限這麼做",
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