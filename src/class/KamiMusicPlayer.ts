import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  ComponentType,
  EmbedBuilder,
  type Guild,
  type GuildMember,
  Message,
  MessageFlags,
  REST,
  RESTJSONErrorCodes,
  type TextChannel,
  type VoiceChannel,
  codeBlock,
} from "discord.js";
import {
  type AudioPlayer,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  type PlayerSubscription,
  StreamType,
  type VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import { KamiMusicMetadata, Platform } from "@/class/KamiMusicMetadata";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { EuqalizerPresets } from "@/class/EqualizerGraph";
import { FFmpeg } from "prism-media";
import { join } from "path";
import { pipeline }from "stream";

import KamiMusicLyric from"@/class/KamiMusicLyric";
import Logger from "@/coree/logger";
import chalk from"chalk";
import ytdl from"@distube/ytdl-core";

import type { EqualizerGraph } from "@/class/EqualizerGraph";
import type { KamiClient } from "@/class/KamiClient";

// const { FFmpeg } = require("prism-media");

/**
 * 全域調整音量
 * 倍率 1 = 原始音量 (-0db)
 * 倍率 0.4 大約 (-30db)
 * 倍率越小音量越小
 * @range 1.0 ~ 0.0
 * @default 0.35
 */
const GlobalVolumeAdjustment = 0.3;

const AddByUrlCommandMention = "</add url:1196368138728657013>";
const AddBySearchCommandMention = "</add search:1196368138728657013>";

export enum RepeatMode {
  Forward             = 0,
  RepeatQueue         = 1,
  RepeatCurrent       = 2,
  Random              = 3,
  RandomNoRepeat      = 4,
  TrueRandom          = 5,
  Backward            = 6,
  BackwardRepeatQueue = 7,
};

interface KamiMusicPlayerPreference {
  volume            : number;
  repeat            : RepeatMode;
  updateVoiceStatus : boolean;
  equalizer         : EqualizerGraph;
}

export class KamiMusicPlayer {
  client                : KamiClient;
  voice                 : VoiceChannel;
  text                  : TextChannel;
  guild                 : Guild;
  owner                 : GuildMember;
  preference            : KamiMusicPlayerPreference;
  queue                 : KamiMusicMetadata[] = [];
  stopped               : boolean             = false;
  private connection    : VoiceConnection;
  private player        : AudioPlayer;
  private subscription  : PlayerSubscription;
  private message       : Message | null      = null;
  private destroyed     : boolean             = false;
  private _lyricTimer   : Timer | null        = null;
  private _currentIndex : number              = 0;
  private _locked       : boolean             = false;
  
  constructor(client: KamiClient, text: TextChannel, voice: VoiceChannel, owner: GuildMember) {
    this.client = client;
    this.voice = voice;
    this.text = text;
    this.guild = voice.guild;
    this.owner = owner;

    const ownerPreference = client.database.user(owner.id);

    this.preference = {
      volume            : ownerPreference.volume ?? 1,
      repeat            : ownerPreference.repeat ?? RepeatMode.Forward,
      equalizer         : EuqalizerPresets[ownerPreference.equalizer] ?? EuqalizerPresets["Normal"],
      updateVoiceStatus : ownerPreference.updateVoiceStatus,
    };

    this.locked = ownerPreference.locked ?? false;

    this.connection = joinVoiceChannel({
      channelId      : voice.id,
      guildId        : voice.guild.id,
      adapterCreator : voice.guild.voiceAdapterCreator,
    });

    this.player = createAudioPlayer({
      behaviors : {
        noSubscriber : NoSubscriberBehavior.Pause,
      },
    });

    this.subscription = this.connection.subscribe(this.player);

    this.connection.on(VoiceConnectionStatus.Disconnected, () => {
      Promise.race([
        entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
      ]).catch(() => {
        this.destroyed = true;
        void this.destroy();
      });
    });

    this.connection.on("error", (error) => {
      Logger.error(error);
    });

    this.player.on(AudioPlayerStatus.Playing, () => {
      if (!this._resource.metadata.lyric) return;
      if (this._lyricTimer) return;

      this._lyricTimer = setInterval(() => {
        if (!this.playbackTime) return;
        try {
          const offsetTime = this.playbackTime - this.lyricsOffset;

          const index =
                  this._resource.metadata.lyrics.getIndex(offsetTime);

          if (this._currentLyricIndex != index) {
            this._currentLyricIndex = index;
            this.updateNowplayingMessage();
          }
        } catch (error) {
          // ignoring all errors here because it will be spammy in the console
        }
      }, 10);
    });

    this.player.on(AudioPlayerStatus.Idle,  async (oldState) => {
      this._resource = null;

      this.stopLyrics();

      if (this.updateNowplayingMessage) {
        // TODO: Wait for discord.js to implement method for updating channel status
        await rest
          .put(`/channels/${this.voiceChannel.id}/voice-status`, {
            body : { status : "" },
          })
          .catch(Logger.error);
      }

      if (oldState.status == AudioPlayerStatus.Playing) {
        if (!this.paused && !this.stopped) {
          if (this.npmsg instanceof Message) {
            await this.npmsg.delete();
            this.npmsg = null;
          }

          if (this.queue.length > 0) {
            switch (this.repeat) {
              case RepeatMode.NoRepeat: {
                if (this.currentIndex < this.queue.length - 1) {
                  this.next();
                } else {
                  this._isFinished = true;
                  this.updateNowplayingMessage(true);
                }

                break;
              }

              case RepeatMode.RepeatQueue: {
                this.next();
                break;
              }

              case RepeatMode.RepeatCurrent: {
                this.play();
                break;
              }

              case RepeatMode.Random: {
                this.currentIndex = Math.floor(
                  Math.random() * this.queue.length
                );
                this.play();
                break;
              }

              case RepeatMode.RandomNoRepeat: {
                if (this._randomQueue.length == 0) {
                  this._randomQueue = [...this.queue];
                }

                this._randomQueue = this._randomQueue.sort(
                  () => 0.5 - Math.random()
                );
                const resource = this._randomQueue.shift();
                this.currentIndex = this.queue.indexOf(resource);

                this.play();
                break;
              }

              case RepeatMode.Backward: {
                if (this.currentIndex > 0) {
                  this.next();
                } else {
                  this._isFinished = true;
                  this.updateNowplayingMessage(true);
                }

                break;
              }

              case RepeatMode.BackwardRepeatQueue: {
                this.next();
                break;
              }

              default:
                break;
            }
          }
        }

        this.stopped = false;
      }
    });

    this.player.on("error", (error) => {
      Logger.error(
        `Error: ${error.message} with resource ${error.resource?.metadata?.title}`
      );
      Logger.error(error);
      this._resource = null;

      if (this.current?.error?.message != error.message) {
        this.current.error = error;
        this.play();
      } else if (
        (this.repeat == RepeatMode.NoRepeat &&
          this.currentIndex < this.queue.length - 1) ||
        this.repeat == RepeatMode.RepeatQueue ||
        (this.repeat == RepeatMode.Backward && this.currentIndex > 0) ||
        this.repeat == RepeatMode.BackwardRepeatQueue
      ) {
        this.next();
      } else if (this.repeat == RepeatMode.Random) {
        this.currentIndex = Math.floor(Math.random() * this.queue.length);
        this.play();
      } else if (this.repeat == RepeatMode.RandomNoRepeat) {
        if (this._randomQueue.length == 0) {
          this._randomQueue = [...this.queue];
        }

        this._randomQueue = this._randomQueue.sort(() => 0.5 - Math.random());
        const resource = this._randomQueue.shift();
        this.currentIndex = this.queue.indexOf(resource);

        this.play();
      }
    });
    this.client.players.set(this.guild.id, this);
  }

  set locked(value) {
    const name = this.guild.members.me!.displayName.replace(/🔒\s?/g, "");

    void this.guild.members.me!.setNickname((value ? "🔒 " : "") + name);
    this._locked = value;
  }

  get locked() {
    return this._locked;
  }

  get current() {
    return this.queue[this.currentIndex];
  }

  set currentIndex(value: number) {
    if (value < 0) {
      value = this.queue.length - 1;
    }

    if (value > this.queue.length - 1) {
      value = 0;
    }

    this._currentIndex = value;
  }

  get currentIndex() {
    return this._currentIndex;
  }

  get nextIndex() {
    switch (this.repeat) {
      case RepeatMode.Forward:
        if (this.currentIndex < this.queue.length - 1) {
          return this.currentIndex + 1;
        }
        break;
        
      case RepeatMode.RepeatQueue:
        if (this.currentIndex < this.queue.length - 1) {
          return this.currentIndex + 1;
        }
        return 0;

      case RepeatMode.RepeatCurrent:
        return this.currentIndex;

      case RepeatMode.Backward:
        if (this.currentIndex > 0) {
          return this.currentIndex - 1;
        }
        break;

      case RepeatMode.BackwardRepeatQueue:
        if (this.currentIndex > 0) {
          return this.currentIndex - 1;
        } else {
          return this.queue.length - 1;
        }
    }

    return -1;
  }

  get paused() {
    return (
      this.player.state.status == AudioPlayerStatus.AutoPaused ||
      this.player.state.status == AudioPlayerStatus.Paused
    );
  }

  set volume(value) {
    this.preference.volume = value;

    if (this._resource) {
      void this._resource.volume.setVolume(
        this._volume / (1 / GlobalVolumeAdjustment)
      );
    }
  }

  get volume() {
    return this.preference.volume;
  }

  set equalizer(value) {
    this.preference.equalizer = value;

    if (this._resource) {
      void this.play(this.currentIndex, this.playbackTime);
    }
  }

  get equalizer() {
    return this.preference.equalizer;
  }

  set repeat(value) {
    switch (value) {
      case RepeatMode.RepeatQueue:
      case RepeatMode.BackwardRepeatQueue: {
        if (this.player.state.status == AudioPlayerStatus.Idle) {
          this.next();
        }

        break;
      }

      case RepeatMode.RandomNoRepeat: {
        if (value != this.repeat) {
          this._randomQueue = [...this.queue];
        }

        break;
      }

      default:
        break;
    }

    this.preference.repeat = value;
  }

  get repeat() {
    return this.preference.repeat;
  }

  get playbackTime() {
    return this._resource?.playbackDuration ?? null;
  }

  get playbackTimeObject() {
    return this.playbackTime
      ? {
        second : ~~(this.playbackTime / 1000) % 60,
        minute : ~~(~~(this.playbackTime / 1000) / 60),
        hour   : ~~(~~(this.playbackTime / 1000) / (60 * 60)),
        day    : ~~(~~(this.playbackTime / 1000) / (60 * 60 * 24)),
      }
      : null;
  }

  /**
   * @return {number}
   */
  get formattedPlaybackTime() {
    if (this.playbackTimeObject) {
      const times = [];
      times.push(
        this.playbackTimeObject.day,
        this.playbackTimeObject.hour,
        this.playbackTimeObject.minute,
        this.playbackTimeObject.second
      );
      return times
        .reduce(
          (a, v, i) =>
            v == 0 && i < 2
              ? a
              : v < 10
                ? a.push(`0${v}`) && a
                : a.push(String(v)) && a,
          []
        )
        .join(":");
    }

    return null;
  }

  async addResource(resource: KamiMusicMetadata | KamiMusicMetadata[], index = this.queue.length) {
    if (Array.isArray(resource)) {
      this.queue.splice(index, 0, ...resource);
    } else {
      this.queue.splice(index, 0, resource);
    }

    if (this.repeat == RepeatMode.RandomNoRepeat) {
      if (Array.isArray(resource)) {
        this._randomQueue.splice(index, 0, ...resource);
      } else {
        this._randomQueue.splice(index, 0, resource);
      }
    }

    if (
      ![
        RepeatMode.Random,
        RepeatMode.RandomNoRepeat,
        RepeatMode.TrueRandom,
      ].includes(this.repeat)
    ) {
      if (this.currentIndex > index) {
        this.currentIndex += 1;
      }

      if (this.queue[this.nextIndex]) {
        if (!this.queue[this.nextIndex].cache) {
          await this.buffer(this.nextIndex);
          this._isBuffering = false;
        }
      }
    }

    // We should play the added resources if the Player is currently idle.
    if (this.player.state.status == AudioPlayerStatus.Idle) {
      if (
        ![
          RepeatMode.Random,
          RepeatMode.RandomNoRepeat,
          RepeatMode.TrueRandom,
        ].includes(this.repeat)
      ) {
        if (Array.isArray(resource)) {
          this.currentIndex = this.queue.indexOf(resource[0]);
        } else {
          this.currentIndex = this.queue.indexOf(resource);
        }
      }

      this.play();
    }

    return this.queue.indexOf(Array.isArray(resource) ? resource[0] : resource);
  }

  /**
   * Remove a resource from the queue by index.
   * @param {number} index The index of the resource to be removed. (starts from 0)
   * @return {?KamiMusicMetadata} The removed resource.
   */
  removeIndex(index) {
    const resource = this.queue[index];

    if (resource instanceof KamiMusicMetadata) {
      if (
        this.currentIndex == index &&
        this.player.state.status == AudioPlayerStatus.Playing
      ) {
        this.stop();
      } else if (
        ![
          RepeatMode.Random,
          RepeatMode.RandomNoRepeat,
          RepeatMode.TrueRandom,
        ].includes(this.repeat)
      ) {
        if (this.currentIndex > index && this.currentIndex > 0) {
          this.currentIndex -= 1;
        }
      }

      this.queue.splice(index, 1);

      if (this.repeat == RepeatMode.RandomNoRepeat) {
        if (this._randomQueue.includes(resource)) {
          this._randomQueue.splice(this._randomQueue.indexOf(resource), 1);
        }
      }

      return resource;
    }

    return null;
  }

  /**
   * Remove a resource from the queue.
   * @param {KamiMusicMetadata} resource The resource to be removed.
   * @return {?number} The removed resource index.
   */
  removeResource(resource) {
    const index = this.queue.indexOf(resource);

    if (index > -1) {
      if (
        ![
          RepeatMode.Random,
          RepeatMode.RandomNoRepeat,
          RepeatMode.TrueRandom,
        ].includes(this.repeat)
      ) {
        if (this.currentIndex > index && this.currentIndex > 0) {
          this.currentIndex -= 1;
        }
      }

      if (
        this.currentIndex == index &&
        this.player.state.status == AudioPlayerStatus.Playing
      ) {
        this.stop();
      }

      this.queue.splice(index, 1);

      if (this.repeat == RepeatMode.RandomNoRepeat) {
        if (this._randomQueue.includes(resource)) {
          this._randomQueue.splice(this._randomQueue.indexOf(resource), 1);
        }
      }

      return index;
    }

    return null;
  }

  /**
   * Clears the queue.
   * @returns {KamiMusicMetadata[]} Deleted entries.
   */
  clear() {
    const deleted = [...this.queue];
    this.queue = [];
    this.player.stop();
    return deleted;
  }

  /**
   * Play resources.
   * @param {number} [index=this.currentIndex] The index of the resource to be played by the player.
   */
  async play(index = this.currentIndex, seek) {
    this.currentIndex = index;

    if (seek == null) {
      Logger.debug(
        `Buffer called at ${new Error().stack.split("\n")[1].trimStart().split("\\").pop()}`
      );
      await this.buffer(index);
      this._isBuffering = false;
    }

    const resource = this.queue[index];

    if (resource) {
      if (resource.playable) {
        let stream;

        if (resource.cache) {
          if (seek == null) {
            Logger.info("▶ Using cache");
          }

          try {
            stream = createReadStream(resource.cache, {
              highWaterMark : 1 << 25,
            });
          } catch (error) {
            resource.cache = null;
          }
        }

        if (!stream) {
          switch (resource.platform) {
            case Platform.Youtube: {
              let agent;

              /* Proxy
              if (resource.region.length)
              if (resource.region.includes("TW")) {
                console.log("Using proxy: JP");
                const Agent = require("https-proxy-agent");
                const proxy = "http://139.162.78.109:3128";
                // const proxy = "http://140.227.59.167:3180";
                agent = new Agent(proxy);
              }
              */

              stream = ytdl(resource.url, {
                filter         : (format) => format.contentLength,
                quality        : "highestaudio",
                highWaterMark  : 1 << 25,
                requestOptions : {
                  timeout : 5000,
                },
                ...(agent && { requestOptions : { agent } }),
              });
              break;
            }

            default:
              break;
          }
        }

        if (stream) {
          const transcoderArgs = [
            "-analyzeduration",
            "0",
            "-loglevel",
            "0",
            "-f",
            "s16le",
            "-ar",
            "48000",
            "-ac",
            "2",
            ...(seek != null ? ["-ss", formatTime(~~(seek / 1000))] : []),
            "-af",
            `firequalizer=gain_entry='${Object.keys(this.equalizer)
              .map((k) => `entry(${k},${this.equalizer[k]})`)
              .join(";")}',dynaudnorm=n=0:c=1`,
            // "-af", `bass=g=${this.audiofilter.bass}`,
          ];

          this._transcoder = new FFmpeg({ args : transcoderArgs });
          const ar = createAudioResource(
            pipeline(stream, this._transcoder, () => void 0),
            {
              inputType    : StreamType.Raw,
              inlineVolume : true,
              metadata     : resource,
            }
          );
          this._resource = ar;

          if (seek != null) {
            this._resource.playbackDuration = seek;
          }

          this.volume = this._volume;
          this.player.play(ar);

          if (seek == null) {
            Logger.info(
              `▶ Playing ${resource.title} ${chalk.gray(this.guild.name)}`
            );

            if (this.updateVoiceStatus) {
              let statusText = `🎵 ${resource.title}`;

              if (this.current?.lyricMetadata) {
                statusText = `🎵 ${this.current.lyricMetadata.artistPredict} - ${this.current.lyricMetadata.titlePredict}`;
              }

              // TODO: Wait for discord.js to implement method for updating channel status
              await rest
                .put(`/channels/${this.voiceChannel.id}/voice-status`, {
                  body : { status : statusText },
                })
                .catch(Logger.error);
            }
          }

          this._isFinished = false;
          this.updateNowplayingMessage();

          if (this.queue[this.nextIndex]) {
            if (!this.queue[this.nextIndex].cache) {
              if (seek == null) {
                Logger.debug(
                  `Buffer called at ${new Error().stack.split("\n")[1].trimStart().split("\\").pop()}`
                );
                this.buffer(this.nextIndex).then(
                  () => (this._isBuffering = true)
                );
              }
            }
          }
        }
      } else {
        this.next();
      }
    }
  }

  /**
   * Pre-buffer a resource.
   * @param {number} index The index of the resource to be buffered.
   * @param {?boolean} force Whether or not the cache checking should be skipped.
   */
  async buffer(index, force = false, _retried = 0) {
    if (this._isBuffering) {
      return;
    }

    this._isBuffering = true;

    if (!existsSync(join(__dirname, "../.cache"))) {
      mkdirSync(join(__dirname, "../.cache"));
    }

    const resource = this.queue[index];

    if (resource) {
      if (resource.durationObject.minute < 6) {
        if (!existsSync(join(__dirname, "../.cache", resource.id)) || force) {
          if (!resource.cache || force) {
            if (resource.playable) {
              let stream;

              switch (resource.platform) {
                case Platform.Youtube: {
                  let agent;

                  /* Proxy
                    if (resource.region.length)
                    if (resource.region.includes("TW")) {
                      console.log("Using proxy: JP");
                      const Agent = require("https-proxy-agent");
                      const proxy = "http://139.162.78.109:3128";
                      // const proxy = "http://140.227.59.167:3180";
                      agent = new Agent(proxy);
                    }
                    */

                  stream = ytdl(resource.url, {
                    filter         : (format) => !!format.contentLength,
                    quality        : "highestaudio",
                    highWaterMark  : 1 << 25,
                    requestOptions : {
                      headersTimeout : 3000,
                    },
                    // ...(agent && { requestOptions : { agent } }),
                  });
                  break;
                }

                default:
                  break;
              }

              if (stream) {
                await new Promise((resolve, reject) => {
                  const retryTimeout = setTimeout(
                    () => stream.emit("error", new Error("Timeouut")),
                    3000
                  );
                  Logger.info(
                    `⏳ Buffering ${resource.title} ${chalk.gray(this.guild.name)}`
                  );
                  const _buf = [];

                  stream.on("data", (data) => {
                    if (retryTimeout) {
                      clearTimeout(retryTimeout);
                    }

                    _buf.push(data);
                  });

                  stream.on("error", (err) => {
                    if (err.message.startsWith("Status code: 4")) {
                      if (err.message.includes("410")) {
                        resource.region.push("TW");
                      }

                      reject(err);
                    } else {
                      stream.destroy();

                      if (_retried > 5) {
                        reject(new Error("Buffer retry limit exceeded."));
                      }

                      Logger.info(
                        `🔄 Buffering ${resource.title} ${chalk.gray(this.guild.name)}`
                      );

                      this._isBuffering = false;
                      this.buffer(index, force, _retried + 1);

                      resolve();
                    }
                  });

                  stream.on("finish", async () => {
                    // check duration
                    if (this.current.duration < 0) {
                      const duration = (await ytdl.getBasicInfo(resource.url))
                        .videoDetails.lengthSeconds;
                      resource.duration = +duration;
                      this.client.apiCache.set(resource.id, resource.toJSON());
                      writeFileSync(
                        join(__dirname, "../.cache", `${resource.id}.metadata`),
                        JSON.stringify(resource.toJSON()),
                        { encoding : "utf-8", flag : "w" }
                      );
                    }

                    Logger.info(
                      `✅ Buffered  ${resource.title} ${chalk.gray(this.guild.name)}`
                    );
                    const _buffer = Buffer.concat(_buf);
                    writeFileSync(
                      join(__dirname, "../.cache/", resource.id),
                      _buffer,
                      { flag : "w" }
                    );
                    resource.cache = join(__dirname, "../.cache/", resource.id);
                    stream.destroy();

                    resolve();
                  });
                });
              }
            }
          }
        } else {
          Logger.debug(
            `Resource has cache at ${join(__dirname, "../.cache/", resource.id).replace("C:\\Users\\Kamiya\\Documents\\GitHub\\Kamiya\\kami-music-bot", "")}`
          );
          resource.cache = join(__dirname, "../.cache/", resource.id);
        }

        // lyrics

        if (resource.lyrics instanceof KamiMusicLyric) {
          if (resource.cache) {
            return;
          }
        }

        if (resource.lyric == null) {
          KamiMusicLyric.searchLyrics(resource.title).then((results) => {
            if (results.length) {
              resource.lyric = results[0].id;
              resource.lyricMetadata = results[0];

              if (
                !existsSync(
                  join(__dirname, "../.cache/", `${resource.lyric}.lyric`)
                )
              ) {
                KamiMusicLyric.fetchLyric(resource.lyric).then((data) => {
                  resource.lyrics = new KamiMusicLyric(data);
                  writeFileSync(
                    join(__dirname, "../.cache/", `${resource.lyric}.lyric`),
                    JSON.stringify(data),
                    { flag : "w" }
                  );
                  writeFileSync(
                    join(__dirname, "../.cache", `${resource.id}.metadata`),
                    JSON.stringify(resource.toJSON()),
                    { encoding : "utf-8", flag : "w" }
                  );
                });
              } else {
                resource.lyrics = new KamiMusicLyric(
                  JSON.parse(
                    readFileSync(
                      join(__dirname, "../.cache/", `${resource.lyric}.lyric`),
                      { encoding : "utf-8" }
                    )
                  )
                );
              }
            }
          });
        } else if (
          !existsSync(join(__dirname, "../.cache/", `${resource.lyric}.lyric`))
        ) {
          KamiMusicLyric.fetchLyric(resource.lyric).then((data) => {
            resource.lyrics = new KamiMusicLyric(data);
            writeFileSync(
              join(__dirname, "../.cache/", `${resource.lyric}.lyric`),
              JSON.stringify(data),
              { flag : "w" }
            );
          });
        } else {
          resource.lyrics = new KamiMusicLyric(
            JSON.parse(
              readFileSync(
                join(__dirname, "../.cache/", `${resource.lyric}.lyric`),
                { encoding : "utf-8" }
              )
            )
          );
        }
      }
    }
  }

  /**
   * Play the next resource.
   * @returns {KamiMusicMetadata} The resource to be played.
   */
  next() {
    if (this.repeat == RepeatMode.RandomNoRepeat) {
      if (this._randomQueue.length == 0) {
        this._randomQueue = [...this.queue];
      }

      this._randomQueue = this._randomQueue.sort(() => 0.5 - Math.random());
      const resource = this._randomQueue.shift();
      this.currentIndex = this.queue.indexOf(resource);
    } else if (
      this.repeat == RepeatMode.Backward ||
      this.repeat == RepeatMode.BackwardRepeatQueue
    ) {
      this.currentIndex -= 1;
    } else {
      this.currentIndex += 1;
    }

    this.play();
    return this.current;
  }

  /**
   * Play the previous resource.
   * @returns {KamiMusicMetadata} The resource to be played.
   */
  prev() {
    if (
      this.repeat == RepeatMode.Backward ||
      this.repeat == RepeatMode.BackwardRepeatQueue
    ) {
      this.currentIndex += 1;
    } else {
      this.currentIndex -= 1;
    }

    this.play();
    return this.current;
  }

  /**
   * Pause the player.
   */
  pause() {
    this.player.pause();
  }

  /**
   * Resume the player.
   */
  resume() {
    this.player.unpause();
  }

  /**
   * Stops the player and transitions to the next resource, if any.
   * @param {boolean} force If `true`, the player won't transition into the next resource.
   */
  stop(force = false) {
    if (force) {
      this.stopped = true;
    }

    this.player.stop();
    delete this._resource;
  }

  /**
   * Destroys the player.
   */
  async destroy() {
    if (this.npmsg instanceof Message) {
      if (this.npmsg.deletable) {
        await this.npmsg.delete().catch(() => void 0);
      }
    }

    this.connection.destroy();
    this.client.players.delete(this.guild.id);
  }

  /**
   * Connects the player.
   * @param {import("discord.js").VoiceChannel} channel
   */
  connect(channel) {
    this.connection = joinVoiceChannel({
      channelId      : channel.id,
      guildId        : channel.guild.id,
      adapterCreator : channel.guild.voiceAdapterCreator,
    });
    this.subscription = this.connection.subscribe(this.player);
  }

  /**
   * Reconnects the player.
   */
  reconnect() {
    this.connection.rejoin();
  }

  /**
   * Updates the nowplaying message
   */
  async updateNowplayingMessage() {
    try {
      const lyrics = this._resource
        ? (this._resource.metadata?.lyrics?.getLine(
          this.playbackTime - this.lyricsOffset
        ) ?? null)
        : null;

      if (this.npmsg) {
        this.npmsg = await this.npmsg
          .edit(npTemplate(this, lyrics))
          .catch(async (err) => {
            if (err.code != RESTJSONErrorCodes.UnknownMessage) {
              console.error(err);
            }

            if (!this._npmsglock) {
              this._npmsglock = true;
              this.npmsg = await this.textChannel.send(
                npTemplate(this, lyrics)
              );
              this._npmsglock = false;
            }
          });
      } else if (!this._npmsglock) {
        this._npmsglock = true;
        this.npmsg = await this.textChannel.send(npTemplate(this, lyrics));
        this._npmsglock = false;
        this._npmsgcollector = this.npmsg.createMessageComponentCollector({
          componentType : ComponentType.Button,
        });
        this._npmsgcollector.on("collect", (btnInter) => {
          switch (btnInter.customId) {
            case "offset-1000":
              this.lyricsOffset -= 1000;
              break;
            case "offset-100":
              this.lyricsOffset -= 100;
              break;
            case "offsetReset":
              this.lyricsOffset = 0;
              break;
            case "offset+100":
              this.lyricsOffset += 100;
              break;
            case "offset+1000":
              this.lyricsOffset += 1000;
              break;
            case "toggleRuby":
              this.showRubyText = !this.showRubyText;
              break;
          }

          btnInter.update(
            npTemplate(
              this,
              this._resource
                ? (this._resource.metadata?.lyrics?.getLine(
                  this.playbackTime - this.lyricsOffset
                ) ?? null)
                : null
            )
          );
        });
      }
    } catch (err) {
      Logger.error(
        `Unable to update nowplaying message in #${this.textChannel.name}`
      );
      Logger.error(err);
    }
  }

  stopLyrics() {
    if (this._lyricstimer) {
      clearInterval(this._lyricstimer);
      delete this._lyricstimer;
      delete this._currentLyricIndex;
    }
  }
}

/**
 * @param {KamiMusicPlayer} player
 * @returns
 */
const npTemplate = (player, lyrics) => {
  const current = player.current;
  const embeds = [
    player._resource != null
      ? new EmbedBuilder()
        .setColor(player.client.Color.Info)
        .setAuthor({
          name    : `正在播放 | ${player.guild.name}`,
          iconURL : player.guild.iconURL(),
        })
        .setDescription(
          `${this.locked ? "🔒" : ""} 使用 ${AddByUrlCommandMention} 或 ${AddBySearchCommandMention} 來添加項目`
        )
        .setThumbnail(current.thumbnail)
        .setTitle(current.title)
        .setURL(current.shortURL)
        .setFields([
          {
            name   : "#️⃣ 編號",
            value  : `${player.currentIndex + 1}`,
            inline : true,
          },
          { name : "⏲️ 長度", value : current.formattedDuration, inline : true },
        ])
        .setFooter({
          text    : current.member.displayName,
          iconURL : current.member.displayAvatarURL(),
        })
        .setTimestamp()
      : new EmbedBuilder()
        .setColor(player.client.Color.Info)
        .setAuthor({
          name    : `正在播放 | ${player.guild.name}`,
          iconURL : player.guild.iconURL(),
        })
        .setDescription(
          `目前沒有在播放任何東西，使用 ${AddByUrlCommandMention} 或 ${AddBySearchCommandMention} 來添加項目`
        )
        .setTimestamp(),
  ];
  const components = [];

  if (lyrics) {
    const ly_prev = codeBlock(
      "md",
      player.showRubyText
        ? `${lyrics.prev?.ruby ? `| ${lyrics.prev.ruby}\n` : ""}| ${lyrics.prev?.value ?? ""}${lyrics.prev?.tw ? `\n> ${lyrics.prev.tw}` : ""}`
        : `| ${lyrics.prev?.raw ?? ""}${lyrics.prev?.tw ? `\n> ${lyrics.prev.tw}` : ""}`
    );
    const ly_current = codeBlock(
      "md",
      player.showRubyText
        ? `${lyrics.current?.ruby ? `# ${lyrics.current.ruby}\n` : ""}# ${lyrics.current?.value ?? ""}${lyrics.current?.tw ? `\n> ${lyrics.current.tw}` : ""}`
        : `# ${lyrics.current?.raw ?? ""}${lyrics.current?.tw ? `\n> ${lyrics.current.tw}` : ""}`
    );
    const ly_next = codeBlock(
      "md",
      player.showRubyText
        ? `${lyrics.next?.ruby ? `| ${lyrics.next?.ruby}\n` : ""}| ${lyrics.next?.value ?? ""}${lyrics.next?.tw ? `\n> ${lyrics.next.tw}` : ""}`
        : `| ${lyrics.next?.raw ?? ""}${lyrics.next?.tw ? `\n> ${lyrics.next.tw}` : ""}`
    );
    embeds.push(
      new EmbedBuilder()
        .setColor(Colors.DarkGrey)
        .setAuthor({
          name : `歌詞${current?.lyricMetadata ? `：${current.lyricMetadata.artistPredict} - ${current.lyricMetadata.titlePredict}` : ""}`,
        })
        .setDescription(`${ly_prev}${ly_current}${ly_next}`)
        .setFooter({
          text : `歌詞偏移：${player.lyricsOffset}ms`,
        })
    );

    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("offset-1000")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("-1s"),
        new ButtonBuilder()
          .setCustomId("offset-100")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("-100ms"),
        new ButtonBuilder()
          .setCustomId("offsetReset")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("重置"),
        new ButtonBuilder()
          .setCustomId("offset+100")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("+100ms"),
        new ButtonBuilder()
          .setCustomId("offset+1000")
          .setStyle(ButtonStyle.Secondary)
          .setLabel("+1s")
      )
    );
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("toggleRuby")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("✏️")
          .setLabel(player.showRubyText ? "隱藏讀音" : "顯示讀音")
      )
    );
  }

  return {
    content : `🎶 正在 ${player.voiceChannel} ${player._resource != null ? "播放" : "待機"}`,
    embeds,
    components,
    flags   : MessageFlags.SuppressNotifications,
  };
};

function formatTime(seconds) {
  let str = "";
  const second = ~~(seconds % 60);
  const minute = ~~(seconds / 60);
  const hour = ~~(minute / 60);

  str += `${hour.toString().padStart(2, "0")}:`;
  str += `${minute.toString().padStart(2, "0")}:`;
  str += `${second.toString().padStart(2, "0")}`;

  return str;
}
