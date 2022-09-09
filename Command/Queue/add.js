const { EmbedBuilder, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandSubcommandBuilder, escapeMarkdown } = require("discord.js");
const { KamiMusicMetadata } = require("../../Class/KamiMusicMetadata");
const { KamiMusicPlayer } = require("../../Class/KamiMusicPlayer");
const YouTube = require("simple-youtube-api");
const Youtube = new YouTube(process.env.YOUTUBE_TOKEN);

module.exports = {
	data: new SlashCommandBuilder()
		.setName("add")
		.setNameLocalization("zh-TW", "新增")
		.setDescription("Add songs into the queue.")
		.setDescriptionLocalization("zh-TW", "將歌曲加入播放佇列")
		.addSubcommand(new SlashCommandSubcommandBuilder()
			.setName("url")
			.setNameLocalization("zh-TW", "連結")
			.setDescription("將連結加入播放佇列")
			.addStringOption(new SlashCommandStringOption()
				.setName("url")
				.setNameLocalization("zh-TW", "連結")
				.setDescription("Support: Youtube")
				.setDescriptionLocalization("zh-TW", "目前支援： Youtube")
				.setRequired(true))
			.addIntegerOption(new SlashCommandIntegerOption()
				.setName("placement")
				.setNameLocalization("zh-TW", "位置")
				.setDescription("指定要在播放佇列哪裡插入歌曲")
				.setMinValue(1)))
		.setDMPermission(false),
	defer     : true,
	ephemeral : true,
	/**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
		try {
			const subcommand = interaction.options.getSubcommand(true);
			const placement = interaction.options.getInteger("placement") ?? undefined;

			if (!interaction.member.voice.channel) throw { message: "ERR_USER_NOT_IN_VOICE" };
			/**
             * @type {KamiMusicPlayer}
             */
			let GuildMusicPlayer = interaction.client.players.get(interaction.guild.id);

			if (GuildMusicPlayer) {
				if (GuildMusicPlayer.locked && GuildMusicPlayer.owner.id != interaction.member.id) throw { message: "ERR_PLAYER_LOCKED" };
			} else
				GuildMusicPlayer = new KamiMusicPlayer(interaction.member.voice.channel, interaction.member, interaction.channel);

			if (GuildMusicPlayer.voiceChannel.id != interaction.member.voice.channel.id)
				throw "ERR_USER_NOT_IN_SAME_VOICE";

			let embed = new EmbedBuilder()
				.setColor(interaction.client.Color.Success)
				.setAuthor({ name: `新增 | ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });

			switch (subcommand) {
				case "url": {
					const url = interaction.options.getString("url");

					// #region Youtube
					if (url.match(/youtu(be|.be)/))
						if (url.match(/^(?!.*\?.*\bv=)https:\/\/www\.youtube\.com\/.*\?.*\blist=.*$/)) {
							// #region 播放佇列
							const playlist = await Youtube.getPlaylist(url).catch(() => {
								throw "ERR_PLAYLIST_NOT_EXIST";
							});
							const videosArr = await playlist.getVideos().catch(() => {
								throw "ERR_FETCH_PLAYLIST_VIDEO";
							});
							const metas = [];
							let songs = [];
							for (let i = 0; i < videosArr.length; i++)
								if (videosArr[i].raw.status.privacyStatus == "private")
									continue;
								else
									try {
										const video = await videosArr[i].fetch();
										video.playlist = playlist;
										const meta = new KamiMusicMetadata(video, interaction.member);
										const blocked = "";

										// if (!meta.blocked)
										metas.push(meta);
										// else blocked = "~~";

										songs.push(`${blocked}${i + 1}. [${escapeMarkdown(video.title.replace(/([[\]()])/g, "\\$1"))}](${video.shortURL})${blocked} ${blocked ? "地區限制" : ""}`);
									} catch (err) {
										return console.error(err);
									}

							const position = await GuildMusicPlayer.addResource(metas, placement - 1 ?? placement);
							if (songs.length > 8) {
								const total = songs.length;
								songs = songs.slice(0, 8);
								songs.push(`　...還有 ${total - songs.length} 項`);
							}

							embed = embed
								.setThumbnail(playlist?.thumbnails?.high?.url)
								.setDescription(`:musical_note: [${playlist.title}](${playlist.url}) 已加到播放佇列`)
								.addFields({ name: "已新增", value: songs.join("\n") })
								.setFooter({ text: `位置：#${position}`, iconURL: interaction.member.displayAvatarURL() })
								.setTimestamp();
							// #endregion
						} else if (url.match(/^(http(s)?:\/\/)?((w){3}.)?youtu(be|.be)?(\.com)?\/.+/)) {
							// #region 影片
							const query = url
								.replace(/(>|<)/gi, "")
								.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
							const id = query[2].split(/[^0-9a-z_-]/i)[0];
							const video = await Youtube.getVideoByID(id).catch((e) => {
								console.error(e);
								throw "ERR_FETCH_VIDEO";
							});

							// 不支援直播
							if (video.raw.snippet.liveBroadcastContent === "live")
								throw "ERR_NOT_SUPPORTED@LIVESTREAM";

							const meta = new KamiMusicMetadata(video, interaction.member);
							const position = await GuildMusicPlayer.addResource(meta, placement);

							embed = embed
								.setThumbnail(meta.thumbnail)
								.setDescription(`:musical_note: [${meta.title}](${meta.url}) 已加到播放佇列`)
								.setFooter({ text: `位置：#${position}`, iconURL: interaction.member.displayAvatarURL() })
								.setTimestamp();
							// #endregion
						} else throw { message: "ERR_INVALID_PARAMETER@URL" };
					// #endregion
					break;
				}

				default:
					break;
			}


			await interaction.editReply({ embeds: [embed], ephemeral: true });
		} catch (e) {
			const errCase = {
				"ERR_INVAILD_PARAMETER"        : "沒有提供連結",
				"ERR_USER_NOT_IN_VOICE"        : "你必須在語音頻道內才能使用這個指令",
				"ERR_USER_NOT_IN_SAME_VOICE"   : "你和我在同一個語音頻道內才能使用這個指令",
				"ERR_PLAYER_LOCKED"            : "你沒有權限和這個播放器互動",
				"ERR_PLAYLIST_NOT_EXIST"       : "播放清單不存在或未公開",
				"ERR_FETCH_PLAYLIST_VIDEO"     : "獲取播放清單中的影片時發生錯誤",
				"ERR_FETCH_VIDEO"              : "獲取影片資訊時發生錯誤",
				"ERR_NOT_SUPPORTED@LIVESTREAM" : "不支援即時串流",
				"ERR_SEARCH_ERROR"             : "搜尋的時候發生錯誤",
				"ERR_SEARCH_NO_RESULT"         : "提供的關鍵字找不到任何結果，可以提供更多來查詢",
				"ERR_INVALID_PARAMETER@URL"    : "未知的連結。請輸入 Youtube 影片或播放清單連結",
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