const { existsSync, mkdirSync, writeFileSync } = require("node:fs");
const { Video } = require("simple-youtube-api");
const { join } = require("node:path");

/**
 * @enum {string}
 */
const Platform = Object.freeze({
  Youtube      : "youtube",
  YoutubeMusic : "youtubemusic",
  Soundcloud   : "soundcloud",
});

class KamiMusicMetadata {

  /**
   *
   * @param {any} data
   * @param {import("discord.js").GuildMember} member
   */
  constructor(data, member) {
    if (data instanceof Video) {

      /**
       * @type {string}
       */
      this.id = data.id;

      /**
       * @type {string}
       */
      this.title = data.title.replace(/&amp;/g, "&");

      /**
       * @type {string}
       */
      this.artist = data.channel.title.replace(/&amp;/g, "&");

      /**
       * @type {number}
       */
      this.duration = data.durationSeconds;

      /**
       * @type {string}
       */
      this.thumbnail = data.thumbnails.high.url;

      /**
       * @type {string}
       */
      this.url = data.url;

      /**
       * @type {string}
       */
      this.shortURL = data.shortURL;

      /**
       * @type {string}
       */
      this.origin = data.playlist?.title;

      /**
       * @type {Platform}
       */
      this.platform = Platform.Youtube;

      /**
       * @type {import("discord.js").GuildMember}
       */
      this.member = member;

      /**
       * @type {import("@discordjs/voice").AudioPlayerError}
       */
      this.error = null;

      /**
       * @type {String[]}
       */
      this.region = data.raw?.contentDetails?.regionRestriction?.blocked ?? [];

      /**
       * @type {boolean}
       */
      this.full = data.full;

      /**
       * @type {any}
       */
      this.raw = data.raw;
    } else if (data instanceof Object) {

      /**
       * @type {string}
       */
      this.id = data.id;

      /**
       * @type {string}
       */
      this.title = data.title.replace(/&amp;/g, "&");

      /**
       * @type {string}
       */
      this.artist = data.artist.replace(/&amp;/g, "&");

      /**
       * @type {number}
       */
      this.duration = data.duration;

      /**
       * @type {string}
       */
      this.thumbnail = data.thumbnail;

      /**
       * @type {string}
       */
      this.url = data.url;

      /**
       * @type {string}
       */
      this.shortURL = data.shortURL;

      /**
       * @type {string}
       */
      this.origin = data.origin;

      /**
       * @type {Platform}
       */
      this.platform = data.platform;

      /**
       * @type {import("discord.js").GuildMember}
       */
      this.member = member;

      /**
       * @type {import("@discordjs/voice").AudioPlayerError}
       */
      this.error = null;

      /**
       * @type {String[]}
       */
      this.region = data.region;

      /**
       * @type {boolean}
       */
      this.full = data.full;

      /**
       * @type {?string}
       */
      this.lyric = data.lyric ?? null;

      /**
       * @type {?{ name: string, url: string, titlePredict: string, artistPredict: string, id: string }}
       */
      this.lyricMetadata = data.lyricMetadata ?? null;

      /**
       * @type {any}
       */
      this.raw = data.raw;
    }

    member.client.apiCache.set(this.id, this.toJSON());

    if (!existsSync(join(__dirname, "../.cache"))) {
      mkdirSync(join(__dirname, "../.cache"));
    }

    writeFileSync(join(__dirname, "../.cache", `${this.id}.metadata`), JSON.stringify(this.toJSON()), { encoding: "utf-8", flag: "w" });
  }

  /**
   * @return {boolean}
   */
  get playable() {
    return !this.region.includes("TW");
  }

  /**
   * @typedef Duration
   * @property {number} second
   * @property {number} minute
   * @property {number} hour
   * @property {number} day
   */

  /**
   * @return {Duration}
   */
  get durationObject() {
    return {
      second : this.duration % 60,
      minute : ~~(this.duration / 60),
      hour   : ~~(this.duration / (60 * 60)),
      day    : ~~(this.duration / (60 * 60 * 24)),
    };
  }

  /**
   * @return {string}
   */
  get formattedDuration() {
    const times = [this.durationObject.day, this.durationObject.hour, this.durationObject.minute, this.durationObject.second];
    return times.reduce((a, v, i) => (v == 0 && i < 2 && a.length == 0) ? a : (v < 10) ? a.push(`0${v}`) && (a) : a.push(String(v)) && (a), []).join(":");
  }

  toJSON() {
    return {
      id            : this.id,
      title         : this.title,
      artist        : this.artist,
      duration      : this.duration,
      thumbnail     : this.thumbnail,
      url           : this.url,
      shortURL      : this.shortURL,
      platform      : this.platform,
      region        : this.region,
      full          : this.full,
      raw           : this.raw,
      lyric         : this.lyric,
      lyricMetadata : this.lyricMetadata,
    };
  }
}

module.exports = { KamiMusicMetadata, Platform };