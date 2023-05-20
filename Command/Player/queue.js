const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder, escapeMarkdown } = require("discord.js");
const { AudioPlayerStatus } = require("@discordjs/voice");
const { RepeatMode } = require("../../Class/KamiMusicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setNameLocalization("zh-TW", "播放佇列")
    .setDescription("Display queue.")
    .setDescriptionLocalization("zh-TW", "顯示播放佇列。")
    .setDMPermission(false),
  defer     : true,
  ephemeral : false,

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

      const listMapper = (v, i, a) =>
        (
          ((i == GuildMusicPlayer.currentIndex) && (GuildMusicPlayer.player.state.status != AudioPlayerStatus.Idle))
            ? (GuildMusicPlayer.paused)
              ? "⏸️ **"
              : (GuildMusicPlayer.repeat == RepeatMode.RepeatCurrent)
                ? "🔂 **"
                : ((GuildMusicPlayer.repeat == RepeatMode.Random) || (GuildMusicPlayer.repeat == RepeatMode.RandomNoRepeat))
                  ? "🔀 **"
                  : "▶️ **"
            : (v.error)
              ? "❌ "
              : "▪️ "
        )
			+ (!v.playable ? "~~" : "")
			+ `\`${i < 9 && a.length >= 10 ? " " : ""}${i + 1}.\``
			// + ` ${v.member}${v.playlist ? `[${v.playlist.title}]**\n　　**` : ""}`
			// + `\`[${v.formattedDuration}]\``
			// + `[${(v.title.length > 21) ? escapeMarkdown(v.title.substring(0, 26).replace(/([[\]()])/g, "\\$1") + "…") : escapeMarkdown(v.title.replace(/([[\]()])/g, "\\$1"))}](${v.shortURL})`
			+ `[${escapeMarkdown(v.title.replace(/([[\]()])/g, "\\$1"))}](${v.shortURL})`
			+ (!v.playable ? "~~" : "")
			+ (((i == GuildMusicPlayer.currentIndex) && (GuildMusicPlayer.player.state.status != "idle")) ? "**" : "")
			+ (v.error ? `\n　　　⚠️ 錯誤：${v.error.message}` : "");

      let songlist = GuildMusicPlayer.queue.map(listMapper);

      let cursor = GuildMusicPlayer.currentIndex;
      let desc = getSubset(songlist, songlist[cursor], 9);
      let range = getSubsetRange(songlist, songlist[cursor], 9);

      let queue = new EmbedBuilder()
        .setColor(interaction.client.Color.Info)
        .setAuthor({ name: `播放佇列 | ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
        .setThumbnail(GuildMusicPlayer.current.thumbnail)
        .setDescription(desc.join("\n"))
        .setFooter({ text: `共 ${GuildMusicPlayer.queue.length} 項` })
        .setTimestamp();

      let paginator = new ActionRowBuilder()
        .setComponents(...[
          new ButtonBuilder()
            .setCustomId("first")
            .setEmoji("⏮")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(range.min == 1),
          new ButtonBuilder()
            .setCustomId("prev")
            .setEmoji("◀")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(range.min == 1),
          new ButtonBuilder()
            .setCustomId("page")
            .setLabel(`${range.min} - ${range.max}`)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId("next")
            .setEmoji("▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(range.max == songlist.length),
          new ButtonBuilder()
            .setCustomId("last")
            .setEmoji("⏭")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(range.max == songlist.length),
        ]);

      const sent = await interaction.editReply({ embeds: [queue], components: [paginator] });
      const collector = sent.createMessageComponentCollector({
        componentType : ComponentType.Button,
        idle          : 15 * 60 * 1000,
      });
      collector.on("collect", async (i) => {
        if (i.member.id == interaction.member.id) {
          await i.deferUpdate();
          songlist = GuildMusicPlayer.queue.map(listMapper);

          switch (i.customId) {
            case "first": {
              cursor = 0;
              break;
            }

            case "prev": {
              cursor -= 9;

              if (cursor < 0)
                cursor = 0;
              break;
            }

            case "page": {
              cursor = GuildMusicPlayer.currentIndex;
              break;
            }

            case "next": {
              cursor += 9;

              if (cursor > songlist.length - 1)
                cursor = songlist.length - 1;
              break;
            }

            case "last": {
              cursor = songlist.length - 1;
              break;
            }

            default: break;
          }

          desc = getSubset(songlist, songlist[cursor], 9);
          range = getSubsetRange(songlist, songlist[cursor], 9);
          queue = queue
            .setThumbnail(GuildMusicPlayer.current.thumbnail)
            .setAuthor({ name: `播放佇列 | ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
            .setDescription(desc.join("\n"))
            .setFooter({ text: `共 ${GuildMusicPlayer.queue.length} 項` })
            .setTimestamp();

          paginator = paginator
            .setComponents(...[
              new ButtonBuilder()
                .setCustomId("first")
                .setEmoji("⏮")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(range.min == 1),
              new ButtonBuilder()
                .setCustomId("prev")
                .setEmoji("◀")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(range.min == 1),
              new ButtonBuilder()
                .setCustomId("page")
                .setLabel(`${range.min} - ${range.max}`)
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId("next")
                .setEmoji("▶")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(range.max == songlist.length),
              new ButtonBuilder()
                .setCustomId("last")
                .setEmoji("⏭")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(range.max == songlist.length),
            ]);

          i.editReply({ embeds: [queue], components: [paginator] });
        } else {
          const embed = EmbedBuilder()
            .setColor(i.client.Coor.Error)
            .setDescription(`${i.client.EmbedIcon.Error} 你沒有權限和這個訊息互動`);
          i.followUp({ embeds: [embed], ephemeral: true });
        }
      });
      collector.on("end", async (c, reason) => {
        if (reason == "idle") {
          await sent.edit({ embeds: [queue.setFooter({ text: "互動已逾時" })] });
          setTimeout(() => sent.delete().catch(() => void 0), 10_000);
        }
      });
    } catch (e) {
      const errCase = {
        ERR_NO_PLAYER: "現在沒有在放音樂",
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

function getSubset(array, value, size) {
  if (array.length <= size) return array;
  const index = array.indexOf(value) - (size - 1) / 2,
    max = Math.max(index, 0),
    min = Math.min(max, array.length - size);
  return array.slice(min, min + size);
}

function getSubsetRange(array, value, size) {
  if (array.length <= size) return { min: 1, max: array.length };
  const index = array.indexOf(value) - (size - 1) / 2,
    max = Math.max(index, 0),
    min = Math.min(max, array.length - size);
  return { min: min + 1, max: min + size };
}