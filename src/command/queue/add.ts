import {
  Colors,
  EmbedBuilder,
  SlashCommandBuilder,
  SlashCommandIntegerOption,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
} from "discord.js";
import { KamiMusicMetadata, Platform } from "@/class/KamiMusicMetadata";
import { fetchPlaylist, fetchVideo, parseUrl } from "@/core/youtube/api";
import { getPlatform, replyError } from "@/core/utils";
import { KamiMusicPlayer } from "@/class/KamiMusicPlayer";

import type { Command } from "@/command";


export default {
  data : new SlashCommandBuilder()
    .setName("add")
    .setNameLocalization("zh-TW", "新增")
    .setDescription("Add songs into the queue.")
    .setDescriptionLocalization("zh-TW", "將歌曲加入播放佇列")
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName("url")
        .setNameLocalization("zh-TW", "連結")
        .setDescription("將連結加入播放佇列")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("url")
            .setNameLocalization("zh-TW", "連結")
            .setDescription("Support: Youtube")
            .setDescriptionLocalization("zh-TW", "目前支援： Youtube")
            .setRequired(true)
        )
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName("placement")
            .setNameLocalization("zh-TW", "位置")
            .setDescription("指定要在播放佇列哪裡插入歌曲")
            .setMinValue(1)
        )
    )
    .addSubcommand(
      new SlashCommandSubcommandBuilder()
        .setName("search")
        .setNameLocalization("zh-TW", "搜尋")
        .setDescription("搜尋並將影片加入播放佇列")
        .addStringOption(
          new SlashCommandStringOption()
            .setName("query")
            .setNameLocalization("zh-TW", "關鍵字")
            .setDescription("The keyword to search.")
            .setDescriptionLocalization("zh-TW", "要搜尋的關鍵字")
            .setAutocomplete(true)
            .setRequired(true)
        )
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName("placement")
            .setNameLocalization("zh-TW", "位置")
            .setDescription("指定要在播放佇列哪裡插入影片")
            .setMinValue(1)
        )
    )
    .setDMPermission(false),
  defer     : true,
  ephemeral : true,
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand(true);
    const placement =
        interaction.options.getInteger("placement") ?? undefined;

    if (!interaction.member.voice.channel) {
      await replyError(interaction, "你必須在語音頻道內才能使用這個指令");
      return;
    }

    const GuildMusicPlayer = this.players.get(interaction.guild.id)
      ?? new KamiMusicPlayer(
        this,
        interaction.channel!,
        interaction.member.voice.channel,
        interaction.member,
      );

    if (GuildMusicPlayer.locked && GuildMusicPlayer.owner.id != interaction.member.id) {
      await replyError(interaction, "你沒有權限和這個播放器互動");
      return;
    }

    if (GuildMusicPlayer.voice.id != interaction.member.voice.channel.id) {
      await replyError(interaction, "你必須和我在同一個語音頻道內才能使用這個指令");
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.Green)
      .setAuthor({
        name    : `新增 | ${interaction.guild.name}`,
        iconURL : interaction.guild.iconURL()!,
      });

    switch (subcommand) {
      case "url": {
        const url = interaction.options.getString("url", true);
        const placement = interaction.options.getInteger("placement") ?? GuildMusicPlayer.queue.length;

        switch (getPlatform(url)) {
          case Platform.Youtube: {
            const res = parseUrl(url);
              
            const metadata: KamiMusicMetadata[] = [];

            if (res.video) {
              const video = await fetchVideo(res.video);
              metadata.push(KamiMusicMetadata.youtube(video, this, interaction.member));
              embed
                .setThumbnail(metadata[0].thumbnail)
                .setDescription(`:musical_note: [${video.title}](${video.url}) 已加到播放佇列`);
            } else if (res.playlist) {
              const playlist = await fetchPlaylist(res.playlist);
              metadata.push(...playlist.videos.map(v => KamiMusicMetadata.youtube(v, this, interaction.member)));
              embed
                .setThumbnail(metadata[0].thumbnail)
                .setDescription(`:musical_note: [${playlist.title}](${playlist.url}) 已加到播放佇列`);
            }

            const position = await GuildMusicPlayer.addResource(metadata, placement);

            embed
              .setFooter({
                text    : `位置：#${position + 1}`,
                iconURL : interaction.member.displayAvatarURL(),
              })
              .setTimestamp();

            break;
          }
          
          default: {
            await replyError(interaction, "未知的連結。請輸入 Youtube 影片或播放清單連結");
            return;
          }
        }
          
        break;
      }

      case "search": {
        const id = interaction.options.getString("query", true);

        let metadata: KamiMusicMetadata;

        if (this.cache.has(id)) {
          metadata = new KamiMusicMetadata({
            ...this.cache.get(id)!,
            member : interaction.member,
          }, this);
        } else {
          const video = await fetchVideo(id);
          metadata = KamiMusicMetadata.youtube(video, this, interaction.member);
        }

        const position = await GuildMusicPlayer.addResource(metadata, placement);

        embed
          .setThumbnail(metadata.thumbnail)
          .setDescription(
            `:musical_note: [${metadata.title}](${metadata.url}) 已加到播放佇列`
          )
          .setFooter({
            text    : `位置：#${position + 1}`,
            iconURL : interaction.member.displayAvatarURL(),
          })
          .setTimestamp();
        break;
      }

      default:
        break;
    }

    await interaction.editReply({
      embeds  : [embed], 
      options : {
        ephemeral : true
      }
    });
    /* } catch (e) {
      const errCase = {
        ERR_INVAILD_PARAMETER          : "沒有提供連結",
        ERR_USER_NOT_IN_VOICE          : "你必須在語音頻道內才能使用這個指令",
        ERR_USER_NOT_IN_SAME_VOICE     : "你和我在同一個語音頻道內才能使用這個指令",
        ERR_PLAYER_LOCKED              : "你沒有權限和這個播放器互動",
        ERR_PLAYLIST_NOT_EXIST         : "播放清單不存在或未公開",
        ERR_FETCH_PLAYLIST_VIDEO       : "獲取播放清單中的影片時發生錯誤",
        ERR_FETCH_VIDEO                : "獲取影片資訊時發生錯誤",
        "ERR_NOT_SUPPORTED@LIVESTREAM" : "不支援即時串流",
        ERR_SEARCH_ERROR               : "搜尋的時候發生錯誤",
        ERR_SEARCH_NO_RESULT           : "提供的關鍵字找不到任何結果，可以提供更多來查詢",
        "ERR_INVALID_PARAMETER@URL" :
          "未知的連結。請輸入 Youtube 影片或播放清單連結",
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
    } */
  },
} satisfies Command;
