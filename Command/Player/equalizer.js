const { EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption, Colors, ComponentType, ActionRowBuilder, StringSelectMenuBuilder, Guild, codeBlock, ModalBuilder, TextInputBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { EqualizerPresets } = require("../../Class/KamiMusicPlayer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("equalizer")
    .setNameLocalization("zh-TW", "等化器")
    .setDescription("View or edit the equalizer.")
    .setDescriptionLocalization("zh-TW", "查看或編輯等化器。")
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
       * @type {import("../../Class/KamiMusicPlayer").KamiMusicPlayer}
       */
      const GuildMusicPlayer = interaction.client.players.get(interaction.guild.id);

      if (!GuildMusicPlayer) throw { message: "ERR_NO_PLAYER" };

      if (GuildMusicPlayer.locked && GuildMusicPlayer.owner.id != interaction.member.id) throw { message: "ERR_PLAYER_LOCKED" };

      if (GuildMusicPlayer.voiceChannel.id != interaction.member.voice.channel.id)
        throw "ERR_USER_NOT_IN_SAME_VOICE";

      const embed = new EmbedBuilder()
        .setColor(interaction.client.Color.Info)
        .setAuthor({ name: `等化器 | ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
        .setDescription(codeBlock(createAsciiChart(GuildMusicPlayer.equalizer)))
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(new StringSelectMenuBuilder()
          .setCustomId("eqPreset")
          .addOptions(
            ...Object.keys(EqualizerPresets).map(k => ({
              label : k,
              value : k,
            })),
          ));

      const sent = await interaction.editReply({
        embeds     : [embed],
        components : [row],
      });

      const collector = sent.createMessageComponentCollector({ idle: 180_000 });
      collector.on("collect", async inter => {
        const player = inter.client.players.get(interaction.guild.id);

        switch (inter.customId) {
          case "eqPreset": {
            player.equalizer = EqualizerPresets[inter.values[0]];

            await inter.update({
              embeds     : [embed.setDescription(codeBlock(createAsciiChart(player.equalizer)))],
              components : [row],
            });
            break;
          }
        }
      });
      collector.on("end", async () => {
        await sent.delete();
      });
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

      if (this.defer)
        if (!this.ephemeral)
          await interaction.deleteReply().catch(() => void 0);
      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  },
};

function createAsciiChart(data) {
  const dBValues = Object.values(data);
  const abs = Object.values(data).map(Math.abs);
  const minDB = Math.min(...dBValues);

  // Set the chart height and width
  const chartHeight = Object.keys(data).length;
  const chartWidth = (Math.max(...abs) > 10 ? Math.max(...abs) : 10) * 2 + 1;
  const center = (chartWidth + 1) / 2;

  // Create an empty chart array
  const chart = Array(chartHeight)
    .fill()
    .map(() => Array(chartWidth).fill(" "));

  // Populate the chart with emojis
  Object.entries(data).forEach(([frequency, dB]) => {
    const y = Object.keys(data).indexOf(frequency);
    let x = dB < 0 ? Math.abs(minDB) - Math.abs(dB) : center + dB - 1;

    chart[y][center - 1] = "│";

    while (x != center - 1) {
      chart[y][x] = "=";

      if (x < center) x++;
      else x--;
    }
  });

  // Generate the ASCII chart string
  let chartString = "";
  chart.forEach((row, i) => {
    let frequency = +Object.keys(data)[i];
    const db = data[frequency];

    if (frequency >= 1000) frequency = `${~~(frequency / 1000)}k`.padStart(3, " ");
    else frequency = `${frequency.toString().padStart(3, " ")}`;
    chartString += `${frequency} ` + row.join("") + ` (${db >= 0 ? "+" : ""}${db}db)` + "\n";
  });

  return chartString;
}