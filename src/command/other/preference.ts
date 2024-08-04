import {
  Colors,
  EmbedBuilder,
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
} from "discord.js";
import type { Command } from "..";
import { RepeatMode } from "@/class/KamiMusicPlayer";

const modeString = [
  "不重複",
  "循環",
  "單曲重複",
  "隨機",
  "隨機（不重複）",
  "平均隨機",
  "倒序",
  "倒序循環",
];

export default {
  data : new SlashCommandBuilder()
    .setName("preference")
    .setNameLocalization("zh-TW", "偏好設定")
    .setDescription("Player preference settings")
    .setDescriptionLocalization("zh-TW", "設定播放器偏好設定")
    // volume
    .addSubcommandGroup(
      new SlashCommandSubcommandGroupBuilder()
        .setName("volume")
        .setNameLocalization("zh-TW", "音量")
        .setDescription("Set the initial playback volume.")
        .setDescriptionLocalization("zh-TW", "設定播放器初始音量")
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName("percentage")
            .setNameLocalization("zh-TW", "百分比")
            .setDescription("Set playback volume in percentage.")
            .setDescriptionLocalization("zh-TW", "使用百分比來設定播放音量。")
            .addIntegerOption(
              new SlashCommandIntegerOption()
                .setName("value")
                .setNameLocalization("zh-TW", "值")
                .setDescription("The percentage to set to.")
                .setDescriptionLocalization("zh-TW", "要設定的百分比。")
                .setMinValue(0)
            )
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName("decibels")
            .setNameLocalization("zh-TW", "分貝")
            .setDescription("Set playback volume in decibels.")
            .setDescriptionLocalization("zh-TW", "使用分貝數來設定播放音量。")
            .addIntegerOption(
              new SlashCommandIntegerOption()
                .setName("value")
                .setNameLocalization("zh-TW", "值")
                .setDescription("The decibels to set to.")
                .setDescriptionLocalization("zh-TW", "要設定的分貝數。")
                .setMinValue(0)
            )
        )
        .addSubcommand(
          new SlashCommandSubcommandBuilder()
            .setName("log")
            .setNameLocalization("zh-TW", "對數")
            .setDescription(
              "Set playback volume in a logarithmic scale percentage."
            )
            .setDescriptionLocalization(
              "zh-TW",
              "使用對數百分比來設定播放音量。"
            )
            .addIntegerOption(
              new SlashCommandIntegerOption()
                .setName("value")
                .setNameLocalization("zh-TW", "值")
                .setDescription("The percentage to set to.")
                .setDescriptionLocalization("zh-TW", "要設定的百分比。")
                .setMinValue(0)
            )
        )
    )
    // list
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName("list")
        .setNameLocalization("zh-TW", "目前")
        .setDescription("List all preference settings.")
        .setDescriptionLocalization("zh-TW", "顯示所有偏好設定。")
    )
    // lock
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName("lock")
        .setNameLocalization("zh-TW", "鎖定")
        .setDescription(
          "Set the initial lock state to make the player only listen to commands from its owner."
        )
        .setDescriptionLocalization(
          "zh-TW",
          "設定是否讓播放器初始只接受播放器擁有者的指令。"
        )
        .addBooleanOption(
          new SlashCommandBooleanOption()
            .setName("state")
            .setNameLocalization("zh-TW", "狀態")
            .setDescription("The lock state to set to.")
            .setDescriptionLocalization("zh-TW", "設定鎖定狀態")
            .setRequired(true)
        )
    )
    // repeat
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName("repeat")
        .setNameLocalization("zh-TW", "重複")
        .setDescription("Set the initial playback repeat mode.")
        .setDescriptionLocalization("zh-TW", "設定循環模式。")
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName("mode")
            .setNameLocalization("zh-TW", "模式")
            .setDescription("The repeat mode to set to.")
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
    )
    // channelStatus
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName("status")
        .setNameLocalization("zh-TW", "語音頻道狀態")
        .setDescription(
          "Set the initial state to whether update the channel state based on currently playing."
        )
        .setDescriptionLocalization(
          "zh-TW",
          "設定是否讓播放器初始在換歌時更新頻道狀態。"
        )
        .addBooleanOption(
          new SlashCommandBooleanOption()
            .setName("state")
            .setNameLocalization("zh-TW", "狀態")
            .setDescription("The lock state to set to.")
            .setDescriptionLocalization("zh-TW", "設定換歌時是否更新頻道狀態。")
        )
    )
    .setDMPermission(false),
  defer     : true,
  ephemeral : true,
  async execute(interaction) {
    try {
      const subcmdgrp = interaction.options.getSubcommandGroup(false);
      const subcmd = interaction.options.getSubcommand(false);
      const preference = this.database.user(interaction.member.id);
      const settingKey = subcmdgrp ?? subcmd;

      let embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setAuthor({
          name    : `偏好設定 | ${interaction.member.displayName}`,
          iconURL : interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      switch (settingKey) {
        case "list": {
          embed = embed
            .setFields([
              {
                name   : "🔊 音量",
                value  : `${preference.volume * 100}%`,
                inline : true,
              },
              {
                name   : "🔒 鎖定",
                value  : `${preference.locked ? "鎖定" : "未鎖定"}`,
                inline : true,
              },
              {
                name   : "🔁 循環模式",
                value  : `${modeString[preference.repeat]}`,
                inline : true,
              },
            ]);
          break;
        }

        case "volume": {
          const inputValue = interaction.options.getInteger("value");

          if (inputValue == null) {
            preference.volume = 1;
            embed = embed.setDescription("已將初始音量設為 `100%`");
            break;
          }

          let settingValue = 1;
          let volumeString = "";

          switch (subcmd) {
            case "percentage": {
              settingValue = inputValue / 100;
              volumeString = `${inputValue}%`;
              break;
            }

            case "decibels": {
              settingValue = Math.pow(10, inputValue / 20) / 100;
              volumeString = `${inputValue}dB`;
              break;
            }

            case "log": {
              settingValue = Math.pow((4 * inputValue) / 25, 1.660964) / 100;
              volumeString = `${inputValue}%log`;
              break;
            }

            default:
              break;
          }

          preference.volume = settingValue;

          embed = embed.setDescription(
            `已將初始音量設為 **${volumeString}** (${settingValue})`
          );
          break;
        }

        case "lock": {
          const settingValue = interaction.options.getBoolean("state", true);
          preference.locked = settingValue;
          embed = embed.setDescription(
            `已將初始鎖定狀態設為 *${settingValue == true ? "*鎖定*" : settingValue == false ? "*未鎖定*" : "`未設定`"}*`
          );
          break;
        }

        case "repeat": {
          const settingValue = interaction.options.getInteger("mode", true);
          preference.repeat = settingValue;
          embed = embed.setDescription(
            `已將初始循環模式設為 *${settingValue != null ? `${modeString[settingValue]}` : "`未設定`"}*`
          );
          break;
        }

        case "status": {
          const settingValue = interaction.options.getBoolean("status", true);
          preference.updateVoiceStatus = settingValue;
          embed = embed.setDescription(
            `${settingValue == true ? "將在歌曲變換時設定語音頻道狀態" : "歌曲變換時**__不會__**設定語音頻道狀態"}`
          );
          break;
        }

        default:
          break;
      }

      await this.database.database.user.write();
      await interaction.editReply({
        embeds  : [embed],
        options : {
          ephemeral : true
        }
      });
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
