import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import type { AudioPlayerError } from "@discordjs/voice";
import type { Duration } from "iso8601-duration";
import type { GuildMember } from "discord.js";
import type { KamiClient } from "./KamiClient";
import type { Video } from "@/core/youtube/video";

/**
 * @enum {string}
 */
export enum Platform {
  Youtube      = "youtube",
  YoutubeMusic = "youtubemusic",
  Soundcloud   = "soundcloud",
};

export class KamiMusicMetadata {
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
  error       : AudioPlayerError | null = null;
  raw         : Video;

  constructor(data: Video, client: KamiClient, member: GuildMember) {
    this.id = data.id;
    this.title = data.title;
    this.artist = data.channel.title;
    this.duration = data.duration;
    this.thumbnail = data.thumbnail.url;
    this.url = data.url;
    this.shortUrl = data.shortUrl;
    this.platform = Platform.Youtube;
    this.member = member;
    this.raw = data;

    client.cache.set(this.id, this.toJSON());

    const cacheFolder = resolve(".cache");

    if (!existsSync(join(__dirname, "../.cache"))) {
      mkdirSync(join(__dirname, "../.cache"));
    }

    writeFileSync(
      join(__dirname, "../.cache", `${this.id}.metadata`),
      JSON.stringify(this.toJSON()),
      { encoding : "utf-8", flag : "w" }
    );
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