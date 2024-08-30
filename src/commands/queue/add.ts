import { Colors, EmbedBuilder, SlashCommandBuilder, SlashCommandStringOption, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder, hyperlink } from "discord.js";
import { KamiResource, Platform } from "@/core/KamiResource";
import { fetchPlaylist, fetchVideo, parseUrl } from "@/api/youtube";
import { ExecutionResultType } from "&";
import { KamiMusicPlayer } from "@/core/KamiMusicPlayer";
import { createWriteStream } from "fs";
import { join } from "path";

import SlashCommandRejectionError from "@/errors/SlashCommandRejectionError";
import ytdl from "@distube/ytdl-core";

import type { KamiCommand, SlashCommandResult } from "&";
import type { ChatInputCommandInteraction } from "discord.js";
import type { KamiClient } from "@/core/KamiClient";

async function handleYoutubeResource(
  this: KamiClient,
  interaction: ChatInputCommandInteraction<"cached">,
  player: KamiMusicPlayer,
  input: string,
  before?: number,
): Promise<SlashCommandResult> {
  const ids = parseUrl(input);
  
  if (ids.video) {
    const video = await fetchVideo(ids.video);

    const cachePath = join(this.cacheDirectory, "audio", video.id);

    ytdl(video.url, {
      filter        : (format) => +format.contentLength > 0,
      quality       : "highestaudio",
      highWaterMark : 1 << 25,
      // ...(agent && { requestOptions : { agent } }),
    }).pipe(createWriteStream(cachePath) as unknown as NodeJS.WritableStream);

    player.addResource(KamiResource.youtube(video, cachePath), before);

    return {
      type: ExecutionResultType.SingleSuccess,
      payload: {
        embeds: [
          new EmbedBuilder()
            .setColor(Colors.Green)
            .setAuthor({
              name    : `新增 | ${interaction.guild.name}`,
              iconURL : interaction.guild.iconURL()!,
            })
            .setDescription(`🎵 ${hyperlink(video.title, video.url)} 已加到播放佇列`)
            .setThumbnail(video.thumbnail.url),
        ],
      },
    };
  }

  if (ids.playlist) {
    const playlist = await fetchPlaylist(ids.playlist);

    return {
      type: ExecutionResultType.SingleSuccess,
      payload: {
        embeds: [
          new EmbedBuilder()
            .setTitle(playlist.title)
            .setURL(playlist.url)
            .setThumbnail(playlist.thumbnail.url),
        ],
      },
    };
  }

  throw new Error("無效的輸入");
};

export default {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add resource to the queue")
    .addSubcommandGroup(new SlashCommandSubcommandGroupBuilder()
      .setName("youtube")
      .setDescription("Add videos from YouTube.")
      .addSubcommand(new SlashCommandSubcommandBuilder()
        .setName("url")
        .setDescription("Add videos from YouTube with url")
        .addStringOption(new SlashCommandStringOption()
          .setName("input")
          .setDescription("The Watch URL/Video ID/Playlist URL/Playlist ID of the resource")
          .setRequired(true))))
    .setDMPermission(false),
  defer: false,
  ephemeral: true,
  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      throw new SlashCommandRejectionError({
        content: "這個指令只能在伺服器中使用",
        ephemeral: true,
      });
    }

    const guild = interaction.guild;    
    const member = interaction.member;
    
    const text = interaction.channel;
    const voice = interaction.member.voice.channel;

    if (!voice || !text) {
      throw new SlashCommandRejectionError({
        content: "你需要在語音頻道內才能使用這個指令",
        ephemeral: true,
      });
    }

    let player = this.players.get(guild.id);

    if (!player) {
      player = new KamiMusicPlayer(
        this,
        member,
        text,
        voice,
      );
      this.players.set(guild.id, player);
    }

    const isMemberPlayerOwner = player.locked && player.owner.id == member.id;
    const isMemberVoiceSameAsPlayerVoice = player.voice.id == voice.id;

    if (!isMemberPlayerOwner && !isMemberVoiceSameAsPlayerVoice) {
      throw new SlashCommandRejectionError({
        content: "你沒有權限和這個播放器互動",
        ephemeral: true,
      });
    }

    const platform = interaction.options.getSubcommandGroup(true) as Platform;
    
    switch (platform) {
      case Platform.YouTube: {
        const input = interaction.options.getString("input", true);

        return await handleYoutubeResource.call(this, interaction, player, input);
      }
    }

    return Promise.resolve({
      type: ExecutionResultType.SingleSuccess,
      payload: {
        content: isMemberVoiceSameAsPlayerVoice ? `🔄️ ${voice}` : `📥 ${voice}`,
      },
    });
  },
} as KamiCommand;