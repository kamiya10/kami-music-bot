import {
  Colors,
  EmbedBuilder,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
} from "discord.js";
import { RepeatMode } from "../../class/KamiMusicPlayer";
import type { Command } from "..";
import { KamiClient } from "@/class/KamiClient";

export default {
  data : new SlashCommandBuilder()
    .setName("repeat")
    .setNameLocalization("zh-TW", "重複")
    .setDescription("Set playback repeat mode.")
    .setDescriptionLocalization("zh-TW", "設定循環模式。")
    .addIntegerOption(
      new SlashCommandIntegerOption()
        .setName("mode")
        .setNameLocalization("zh-TW", "模式")
        .setDescription("Repeat Mode")
        .setDescriptionLocalization("zh-TW", "循環模式")
        .setChoices(
          ...[
            {
              name               : "Forward",
              name_localizations : { "zh-TW" : "不重複" },
              value              : RepeatMode.Forward,
            },
            {
              name               : "Repeat Queue",
              name_localizations : { "zh-TW" : "循環" },
              value              : RepeatMode.RepeatQueue,
            },
            {
              name               : "Repeat Current",
              name_localizations : { "zh-TW" : "單曲重複" },
              value              : RepeatMode.RepeatCurrent,
            },
            {
              name               : "Random",
              name_localizations : { "zh-TW" : "隨機" },
              value              : RepeatMode.Random,
            },
            {
              name               : "Random Without Repeat",
              name_localizations : { "zh-TW" : "隨機（不重複）" },
              value              : RepeatMode.RandomNoRepeat,
            },
            {
              name               : "Backward",
              name_localizations : { "zh-TW" : "倒序播放" },
              value              : RepeatMode.Backward,
            },
            {
              name               : "Backward Repeat Queue",
              name_localizations : { "zh-TW" : "倒序循環" },
              value              : RepeatMode.BackwardRepeatQueue,
            },
          ]
        )
        .setRequired(true)
    )
    .setDMPermission(false),
  defer     : true,
  ephemeral : false,

  /**
   * @param {import("discord.js").ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      if (!interaction.member.voice.channel) {
        throw { message : "ERR_USER_NOT_IN_VOICE" };
      }

      const player = this.players.get(interaction.guild.id);

      if (!player) {
        throw { message : "ERR_NO_PLAYER" };
      }

      if (
        player.locked &&
        player.owner.id != interaction.member.id
      ) {
        throw { message : "ERR_PLAYER_LOCKED" };
      }

      if (
        player.voice.id != interaction.member.voice.channel.id
      ) {
        throw "ERR_USER_NOT_IN_SAME_VOICE";
      }

      const mode = interaction.options.getInteger("mode", true);
      player.repeat = mode;

      const modeString = [
        "▶ 不重複",
        "🔁 循環",
        "🔂 單曲重複",
        "🎲 隨機",
        "🔀 隨機（不重複）",
        "🔀 平均隨機",
        "◀ 倒序",
        "🔁◀ 倒序循環",
      ][mode];

      const sent = await interaction.editReply({ content : modeString });
      setTimeout(() => void sent.delete().catch(() => void 0), KamiClient.MessageAutoDeleteTimeout);
    } catch (e) {
      const errCase = {
        ERR_USER_NOT_IN_VOICE      : "你必須在語音頻道內才能使用這個指令",
        ERR_USER_NOT_IN_SAME_VOICE : "你和我在同一個語音頻道內才能使用這個指令",
        ERR_NO_PLAYER              : "現在沒有在放音樂",
        ERR_PLAYER_LOCKED          : "你沒有權限和這個播放器互動",
      }[e.message];

      const embed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setTitle(`❌ 錯誤`);

      if (!errCase) {
        embed
          .setDescription(`發生了預料之外的錯誤：\`${e.message}\``)
          .setFooter({ text : "ERR_UNCAUGHT_EXCEPTION" });
        console.error(e);
      } else {
        embed.setDescription(errCase).setFooter({ text : e.message });
      }

      if (this.defer) {
        if (!this.ephemeral) {
          await interaction.deleteReply().catch(() => void 0);
        }
      }

      await interaction.followUp({ embeds : [embed], ephemeral : true });
    }
  },
} satisfies Command;
