const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { Client: Genius } = require("genius-lyrics");
const genius = new Genius();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lyrics")
    .setNameLocalization("zh-TW", "歌詞")
    .setDescription("Display the lyrics of the currently playing song.")
    .setDescriptionLocalization("zh-TW", "顯示目前播放歌曲的歌詞。")
    .setDMPermission(false),
  defer     : true,
  ephemeral : true,

  /**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
  async execute(interaction) {
    try {

      /**
			 * @type {import("../../Class/KamiMusicPlayer").KamiMusicPlayer}
			 */
      const GuildMusicPlayer = interaction.client.players.get(interaction.guild.id);

      if (!GuildMusicPlayer) throw { message: "ERR_NO_PLAYER" };

      const resource = GuildMusicPlayer._resource;
      let embed = new EmbedBuilder()
        .setColor(interaction.client.Color.Info)
        .setAuthor({ name: `歌詞 | ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
        .setThumbnail(GuildMusicPlayer.current.thumbnail)
        .setTitle(GuildMusicPlayer.current.title)
        .setURL(GuildMusicPlayer.current.url)
        .setFooter({ text: "歌詞提供：Genius", iconURL: "https://upload.cc/i1/2022/09/11/KmhuEB.png" })
        .setTimestamp();

      if (resource)
        try {
          const song = (await genius.songs.search(GuildMusicPlayer.current.title))[0];

          const lyrics = await song.lyrics();

          embed = embed
            .setDescription(lyrics.split("/n").slice(2).join("\n").trim());
        } catch (e) {
          embed = embed
            .setURL(GuildMusicPlayer.current.url)
            .setDescription("找不到歌詞");
        }
      else
        embed = embed.setDescription("目前沒有在播放任何東西");

      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (e) {
      const errCase = {
        ERR_USER_NOT_IN_VOICE      : "你必須在語音頻道內才能使用這個指令",
        ERR_USER_NOT_IN_SAME_VOICE : "你和我在同一個語音頻道內才能使用這個指令",
        ERR_NO_PLAYER              : "現在沒有在放音樂",
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