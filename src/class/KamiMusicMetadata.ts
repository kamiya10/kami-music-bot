import { existsSync, writeFileSync } from "fs";
import { join } from "path";

import type { AudioPlayerError } from "@discordjs/voice";
import type { Duration } from "iso8601-duration";
import type { GuildMember } from "discord.js";
import { KamiClient } from "./KamiClient";
import type { Video } from "@/core/youtube/video";

/**
 * @enum {string}
 */
export enum Platform {
  Youtube      = "youtube",
  YoutubeMusic = "youtubemusic",
  Soundcloud   = "soundcloud",
};

interface IKamiMusicMetadata {
  id          : string;
  title       : string;
  artist      : string;
  duration    : Duration;
  thumbnail   : string;
  url         : string;
  shortUrl  ? : string;
  platform    : Platform;
  /** The member who requested this resource */
  member      : GuildMember;
  error     ? : AudioPlayerError;
  raw         : Video;
}

export type KamiMusicMetadataCache = Omit<IKamiMusicMetadata, "member" | "error">

export class KamiMusicMetadata implements IKamiMusicMetadata {
  id          : string;
  title       : string;
  artist      : string;
  duration    : Duration;
  thumbnail   : string;
  url         : string;
  shortUrl  ? : string;
  platform    : Platform;
  /** The member who requested this resource */
  member      : GuildMember;
  error     ? : AudioPlayerError;
  raw         : Video;
  cachePath ? : string;
  
  constructor(data: IKamiMusicMetadata, client: KamiClient, ) {
    this.id = data.id;
    this.title = data.title;
    this.artist = data.artist;
    this.duration = data.duration;
    this.thumbnail = data.thumbnail;
    this.url = data.url;
    this.shortUrl = data.shortUrl;
    this.platform = data.platform;
    this.member = data.member;
    this.error = data.error;
    this.raw = data.raw;

    client.cache.set(this.id, this.toJSON());

    writeFileSync(
      join(KamiClient.CacheFolder, `${this.id}.metadata`),
      JSON.stringify(this.toJSON()),
      { encoding : "utf-8", flag : "w" }
    );

    const cachePath = join(KamiClient.CacheFolder, `${this.id}`);

    if (existsSync(cachePath)) {
      this.cachePath = cachePath;
    }

  }

  static youtube(video: Video, client: KamiClient, member: GuildMember): KamiMusicMetadata {
    return new KamiMusicMetadata({
      id        : video.id,
      title     : video.title,
      artist    : video.channel.title,
      duration  : video.duration,
      thumbnail : video.thumbnail.url,
      url       : video.url,
      shortUrl  : video.shortUrl,
      platform  : Platform.Youtube,
      member    : member,
      raw       : video,
    }, client);
  }

  get formattedDuration() {
    const times = [];

    if (this.duration.seconds) {
      times.push(this.duration.seconds.toString().padStart(2, "0"));
    }

    if (this.duration.minutes) {
      times.push(this.duration.minutes.toString().padStart(2, "0"));
    }
    
    if (this.duration.hours) {
      times.push(this.duration.hours.toString());
    }

    if (this.duration.days) {
      times.push(this.duration.days.toString());
    }
    
    return times.join(":");
  }

  toJSON() {
    return {
      id        : this.id,
      title     : this.title,
      artist    : this.artist,
      duration  : this.duration,
      thumbnail : this.thumbnail,
      url       : this.url,
      shortURL  : this.shortUrl,
      platform  : this.platform,
      raw       : this.raw,
    };
  }
}