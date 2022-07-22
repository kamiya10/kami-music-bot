const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { KamiMusicPlayer } = require("../../Class/KamiMusicPlayer");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("connect")
		.setNameLocalization("zh-TW", "加入語音")
		.setNameLocalization("ja", "加入語音")
		.setDescription("Joins the voice channel you are connected in.")
		.setDescriptionLocalization("zh-TW", "加入你所在的語音頻道。")
		.setDescriptionLocalization("ja", "加入語音")
		.setDMPermission(false),
	defer     : true,
	ephemeral : false,
	/**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
		try {
			if (!interaction.member.voice.channel) throw { message: "ERR_USER_NOT_IN_VOICE" };
			/**
			 * @type {KamiMusicPlayer}
			 */
			const GuildMusicPlayer = interaction.client.players.get(interaction.guild.id);

			if (GuildMusicPlayer) {
				if (GuildMusicPlayer.locked && GuildMusicPlayer.owner.id != interaction.member.id) throw { message: "ERR_PLAYER_LOCKED" };
				GuildMusicPlayer.connect(interaction.member.voice.channel);
			} else
				new KamiMusicPlayer(interaction.member.voice.channel, interaction.member);

			await interaction.editReply({ content: "✅" });
		} catch (e) {
			const errCase = {
				"ERR_USER_NOT_IN_VOICE" : "你必須在語音頻道內才能使用這個指令",
				"ERR_PLAYER_LOCKED"     : "你沒有權限和這個播放器互動",
			}[e.message];

			const embed = new EmbedBuilder()
				.setColor(interaction.client.Color.Error)
				.setTitle(`${interaction.client.EmbedIcon.Error} 錯誤`);

			if (!errCase) {
				embed.setDescription(`發生了預料之外的錯誤：\`${e.message}\``)
					.setFooter({ text: "ERR_UNCAUGHT_EXCEPTION" });
				console.error(e);
			} else
				embed.setDescription(errCase)
					.setFooter({ text: e.message });

			if (this.defer)
				if (!this.ephemeral)
					await interaction.deleteReply().catch(() => void 0);
			await interaction.followUp({ embeds: [embed], ephemeral: true });
		}
	},
};