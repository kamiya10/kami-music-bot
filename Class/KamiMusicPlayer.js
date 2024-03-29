const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, ComponentType, codeBlock, EmbedBuilder, Message, MessageFlags, RESTJSONErrorCodes, REST } = require("discord.js");
const { AudioPlayerStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnectionStatus } = require("@discordjs/voice");
const { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { FFmpeg } = require("prism-media");
const { KamiMusicMetadata } = require("./KamiMusicMetadata");
const { Platform } = require("./KamiMusicMetadata");
const { join } = require("node:path");
const { pipeline } = require("node:stream");
const chalk = require("chalk");
const ytdl = require("ytdl-core");
const KamiMusicLyric = require("./KamiMusicLyric");
const rest = new REST().setToken(process.env.KAMI_TOKEN);

const connectionLogger = require("../Core/logger").child({ scope: "Connection" });
const playerLogger = require("../Core/logger").child({ scope: "Player" });
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

/**
 * @enum {number}
 */
const RepeatMode = Object.freeze({
  NoRepeat            : 0,
  RepeatQueue         : 1,
  RepeatCurrent       : 2,
  Random              : 3,
  RandomNoRepeat      : 4,
  TrueRandom          : 5,
  Backward            : 6,
  BackwardRepeatQueue : 7,
});

/**
 * @enum {Record<number, number>}
 */
const EqualizerPresets = Object.freeze({
  Normal: {
    32    : 0,
    64    : 0,
    125   : 0,
    250   : 0,
    500   : 0,
    1000  : 0,
    2000  : 0,
    4000  : 0,
    8000  : 0,
    16000 : 0,
  },
  Classic: {
    32    : 4,
    64    : 1,
    125   : -2,
    250   : -4,
    500   : 0,
    1000  : 1,
    2000  : 1,
    4000  : -2,
    8000  : -4,
    16000 : 3,
  },
  Pop: {
    32    : -3,
    64    : -3,
    125   : -5,
    250   : -2,
    500   : 3,
    1000  : 3,
    2000  : -1,
    4000  : -2,
    8000  : -3,
    16000 : 0,
  },
  Rock: {
    32    : 0,
    64    : 3,
    125   : -1,
    250   : -1,
    500   : 1,
    1000  : -2,
    2000  : 0,
    4000  : 4,
    8000  : -4,
    16000 : 0,
  },
  HipHop: {
    32    : 2,
    64    : 2,
    125   : 1,
    250   : -5,
    500   : 3,
    1000  : 1,
    2000  : 0,
    4000  : -1,
    8000  : -5,
    16000 : 0,
  },
  Jazz: {
    32    : -1,
    64    : 0,
    125   : -3,
    250   : -4,
    500   : -4,
    1000  : 3,
    2000  : -1,
    4000  : 2,
    8000  : -1,
    16000 : -3,
  },
  Latin: {
    32    : -1,
    64    : 0,
    125   : -1,
    250   : -3,
    500   : 0,
    1000  : 2,
    2000  : 1,
    4000  : -2,
    8000  : -5,
    16000 : -3,
  },
  Acoustic: {
    32    : 0,
    64    : 0,
    125   : 2,
    250   : -2,
    500   : 3,
    1000  : 0,
    2000  : -2,
    4000  : 1,
    8000  : -2,
    16000 : -4,
  },
  Electronic: {
    32    : 2,
    64    : 4,
    125   : 0,
    250   : 0,
    500   : 1,
    1000  : -2,
    2000  : -2,
    4000  : 3,
    8000  : 0,
    16000 : 0,
  },
  Lounge: {
    32    : 4,
    64    : 4,
    125   : 3,
    250   : 2,
    500   : 0,
    1000  : 0,
    2000  : 2,
    4000  : 6,
    8000  : 6,
    16000 : 3,
  },
  SoftLounge: {
    32    : -1,
    64    : -1,
    125   : -2,
    250   : -4,
    500   : -6,
    1000  : -6,
    2000  : -1,
    4000  : 2,
    8000  : 0,
    16000 : -2,
  },
  VocalBoost: {
    32    : -2,
    64    : 0,
    125   : -5,
    250   : 3,
    500   : 3,
    1000  : 0,
    2000  : 1,
    4000  : -4,
    8000  : -2,
    16000 : 0,
  },
  TrebleBoost: {
    32    : -2,
    64    : -2,
    125   : -4,
    250   : -2,
    500   : 0,
    1000  : 1,
    2000  : 2,
    4000  : 2,
    8000  : 1,
    16000 : 2,
  },
  BassBoost: {
    32    : 8,
    64    : 8,
    125   : 7,
    250   : 4,
    500   : 1,
    1000  : 0,
    2000  : 0,
    4000  : 0,
    8000  : 1,
    16000 : 1,
  },
});

class KamiMusicPlayer {

  /**
   * @param {import("discord.js").TextChannel} voiceChannel
   * @param {import("discord.js").GuildMember} member
   */
  constructor(voiceChannel, member, textChannel) {

    /**
     * @type {import("discord.js").Client}
     */
    this.client = voiceChannel.client;

    /**
     * @type {import("discord.js").TextChannel}
     */
    this.voiceChannel = voiceChannel;

    /**
     * @type {import("discord.js").TextChannel}
     */
    this.textChannel = textChannel;

    /**
     * @type {import("discord.js").Guild}
     */
    this.guild = voiceChannel.guild;

    /**
     * @type {import("discord.js").GuildMember}
     */
    this.owner = member;

    const preference = this.client.setting.user.data[this.owner.id];

    /**
     * @type {boolean}
     */
    this.locked = preference?.global?.locked ?? preference?.[this.guild.id]?.locked ?? false;

    /**
     * @type {boolean}
     */
    this.updateVoiceStatus = preference?.global?.status ?? preference?.[this.guild.id]?.status ?? true;

    /**
     * @type {import("@discordjs/voice").VoiceConnection}
     */
    this.connection = joinVoiceChannel({
      channelId      : voiceChannel.id,
      guildId        : voiceChannel.guild.id,
      adapterCreator : voiceChannel.guild.voiceAdapterCreator,
    });

    /**
     * @type {import("@discordjs/voice").AudioPlayer}
     */
    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });

    /**
     * @type {import("@discordjs/voice").PlayerSubscription}
     */
    this.subscription = this.connection.subscribe(this.player);

    /**
     * @type {KamiMusicMetadata[]}
     */
    this.queue = [];

    /**
     * @type {number}
     */
    this.currentIndex = 0;

    /**
     * @type {RepeatMode}
     */
    this.repeat = preference?.global?.repeat ?? preference?.[this.guild.id]?.repeat ?? RepeatMode.NoRepeat;

    /**
     * @type {boolean}
     */
    this.stopped = false;

    /**
     * @type {number} Volume in percentage
     */
    this.volume = preference?.global?.volume ?? preference?.[this.guild.id]?.volume ?? 1;

    /**
     * @type {?import("discord.js").Message}
     */
    this.npmsg = null;

    /**
     * @type {number} Lyrics offset in ms
     */
    this.lyricsOffset = 0;

    this.showRubyText = true;

    /**
     * @type {?NodeJS.Timer}
     */
    this._lyricstimer = null;

    /**
     * Equalizer parameters
     */
    this.equalizer = EqualizerPresets.Normal;

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        this.destroy();
      }
    });
    this.connection.on("error", (error) => {
      connectionLogger.error(error);
    });
    this.player.on(AudioPlayerStatus.Playing, () => {
      this.current.error = undefined;

      if (this._resource.metadata.lyric) {
        if (!this._lyricstimer) {
          this._lyricstimer = setInterval(() => {
            if (this.playbackTime) {
              try {
                const offsetTime = this.playbackTime - this.lyricsOffset;

                const index = this._resource.metadata.lyrics.getIndex(offsetTime);

                if (this._currentLyricIndex != index) {
                  this._currentLyricIndex = index;
                  this.updateNowplayingMessage();
                }
              } catch (error) {
              // ignoring all errors here because it will be spammy in the console
              }
            }
          }, 10);
        }
      }
    });
    this.player.on(AudioPlayerStatus.Idle, async (oldState) => {
      this._resource = null;

      this.stopLyrics();

      if (this.updateNowplayingMessage) {
        // TODO: Wait for discord.js to implement method for updating channel status
        await rest.put(`/channels/${this.voiceChannel.id}/voice-status`, { body: { status: "" } }).catch(playerLogger.error);
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
                if (this.currentIndex < (this.queue.length - 1)) {
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
                this.currentIndex = Math.floor(Math.random() * this.queue.length);
                this.play();
                break;
              }

              case RepeatMode.RandomNoRepeat: {
                if (this._randomQueue.length == 0) {
                  this._randomQueue = [...this.queue];
                }

                this._randomQueue = this._randomQueue.sort(() => 0.5 - Math.random());
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

              default: break;
            }
          }
        }

        this.stopped = false;
      }
    });
    this.player.on("error", (error) => {
      playerLogger.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
      playerLogger.error(error);
      this._resource = null;

      if (this.current?.error?.message != error.message) {
        this.current.error = error;
        this.play();
      } else if (this.repeat == RepeatMode.NoRepeat && this.currentIndex < (this.queue.length - 1)
        || this.repeat == RepeatMode.RepeatQueue
        || this.repeat == RepeatMode.Backward && this.currentIndex > 0
        || this.repeat == RepeatMode.BackwardRepeatQueue) {
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

  /**
   * @param {boolean} value
   */
  set locked(value) {
    this.guild.members.me.setNickname((value ? "🔒 " : "") + this.guild.members.me.displayName.replace(/🔒\s?/g, ""));
    this._locked = value;
  }

  /**
   * @return {boolean}
   */
  get locked() {
    return this._locked;
  }

  /**
   * @return {KamiMusicMetadata}
   */
  get current() {
    return this.queue[this.currentIndex];
  }

  /**
   * @param {number} value
   */
  set currentIndex(value) {
    if (value < 0) {
      value = this.queue.length - 1;
    }

    if (value > (this.queue.length - 1)) {
      value = 0;
    }

    this._currentIndex = value;
  }

  /**
   * @return {number} starts from 0
   */
  get currentIndex() {
    return this._currentIndex;
  }

  /**
   * @return {number}
   */
  get nextIndex() {
    switch (this.repeat) {
      case RepeatMode.NoRepeat:
        if (this.currentIndex < (this.queue.length - 1)) {
          return this.currentIndex + 1;
        }

        break;
      case RepeatMode.RepeatQueue:
        if (this.currentIndex < (this.queue.length - 1)) {
          return this.currentIndex + 1;
        } else {
          return 0;
        }

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

      default: break;
    }

    return -1;
  }

  /**
   * @return {boolean}
   */
  get paused() {
    return this.player.state.status == AudioPlayerStatus.AutoPaused || this.player.state.status == AudioPlayerStatus.Paused;
  }

  /**
   * @param {number} value
   */
  set volume(value) {
    this._volume = value;

    if (this._resource) {
      this._resource.volume.setVolume(this._volume / (1 / GlobalVolumeAdjustment));
    }
  }

  /**
   * @return {number}
   */
  get volume() {
    return this._volume;
  }

  /**
   * @param {Record<number, number>} value
   */
  set equalizer(value) {
    this._equalizer = value;

    if (this._resource) {
      this.play(undefined, this.playbackTime);
    }
  }

  /**
   * @return {Record<number, number>}
   */
  get equalizer() {
    return this._equalizer;
  }

  /**
   * @param {number} value
   */
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

      default: break;
    }

    this._repeat = value;
  }

  /**
   * @return {number}
   */
  get repeat() {
    return this._repeat;
  }

  /**
   * @return {number}
   */
  get playbackTime() {
    return this._resource?.playbackDuration ?? null;
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
  get playbackTimeObject() {
    return this.playbackTime ? {
      second : ~~(this.playbackTime / 1000) % 60,
      minute : ~~(~~(this.playbackTime / 1000) / 60),
      hour   : ~~(~~(this.playbackTime / 1000) / (60 * 60)),
      day    : ~~(~~(this.playbackTime / 1000) / (60 * 60 * 24)),
    } : null;
  }

  /**
   * @return {number}
   */
  get formattedPlaybackTime() {
    if (this.playbackTimeObject) {
      const times = [];
      times.push(this.playbackTimeObject.day, this.playbackTimeObject.hour, this.playbackTimeObject.minute, this.playbackTimeObject.second);
      return times.reduce((a, v, i) => (v == 0 && i < 2) ? a : (v < 10) ? a.push(`0${v}`) && (a) : a.push(String(v)) && (a), []).join(":");
    }

    return null;
  }

  /**
   * Add resources to the queue.
   * @param {KamiMusicMetadata | KamiMusicMetadata[]} resource The resources to add.
   * @param {?number} index The index resources should append after.
   * @return {Promise<number>} The index the resource is at in the queue.
   */
  async addResource(resource, index = this.queue.length) {
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

    if (![RepeatMode.Random, RepeatMode.RandomNoRepeat, RepeatMode.TrueRandom].includes(this.repeat)) {
      if (this.currentIndex > index) {
        this.currentIndex += 1;
      }

      if (this.queue[this.nextIndex]) {
        if (!this.queue[this.nextIndex].cache) {

          playerLogger.debug(`Buffer called at ${(new Error()).stack.split("\n")[1].trimStart().split("\\").pop()}`);
          await this.buffer(this.nextIndex);
          this._isBuffering = false;
        }
      }
    }

    if (this.player.state.status == AudioPlayerStatus.Idle) {
      if (![RepeatMode.Random, RepeatMode.RandomNoRepeat, RepeatMode.TrueRandom].includes(this.repeat)) {
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
      if (this.currentIndex == index && this.player.state.status == AudioPlayerStatus.Playing) {
        this.stop();
      } else if (![RepeatMode.Random, RepeatMode.RandomNoRepeat, RepeatMode.TrueRandom].includes(this.repeat)) {
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
      if (![RepeatMode.Random, RepeatMode.RandomNoRepeat, RepeatMode.TrueRandom].includes(this.repeat)) {
        if (this.currentIndex > index && this.currentIndex > 0) {
          this.currentIndex -= 1;
        }
      }

      if (this.currentIndex == index && this.player.state.status == AudioPlayerStatus.Playing) {
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
      playerLogger.debug(`Buffer called at ${(new Error()).stack.split("\n")[1].trimStart().split("\\").pop()}`);
      await this.buffer(index);
      this._isBuffering = false;
    }

    const resource = this.queue[index];

    if (resource) {
      if (resource.playable) {
        let stream;

        if (resource.cache) {
          if (seek == null) {
            playerLogger.info("▶ Using cache");
          }

          try {
            stream = createReadStream(resource.cache, {
              highWaterMark: 1 << 25,
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

              stream = ytdl(resource.url,
                {
                  filter         : (format) => format.contentLength,
                  quality        : "highestaudio",
                  highWaterMark  : 1 << 25,
                  requestOptions : {
                    timeout: 5000,
                  },
                  ...(agent && { requestOptions: { agent } }),
                });
              break;
            }

            default: break;
          }
        }

        if (stream) {
          const transcoderArgs = [
            "-analyzeduration", "0",
            "-loglevel", "0",
            "-f", "s16le",
            "-ar", "48000",
            "-ac", "2",
            ...(seek != null ? ["-ss", formatTime(~~(seek / 1000))] : []),
            "-af", `firequalizer=gain_entry='${Object.keys(this.equalizer).map(k => `entry(${k},${this.equalizer[k]})`).join(";")}',dynaudnorm=n=0:c=1`,
          // "-af", `bass=g=${this.audiofilter.bass}`,
          ];

          this._transcoder = new FFmpeg({ args: transcoderArgs });
          const ar = createAudioResource(pipeline(stream, this._transcoder, () => void 0), {
            inputType    : StreamType.Raw,
            inlineVolume : true,
            metadata     : resource,
          });
          this._resource = ar;

          if (seek != null) {
            this._resource.playbackDuration = seek;
          }

          this.volume = this._volume;
          this.player.play(ar);

          if (seek == null) {
            playerLogger.info(`▶ Playing ${resource.title} ${chalk.gray(this.guild.name)}`);

            if (this.updateVoiceStatus) {
              let statusText = `🎵 ${resource.title}`;

              if (this.current?.lyricMetadata) {
                statusText = `🎵 ${this.current.lyricMetadata.artistPredict} - ${this.current.lyricMetadata.titlePredict}`;
              }

              // TODO: Wait for discord.js to implement method for updating channel status
              await rest.put(`/channels/${this.voiceChannel.id}/voice-status`, { body: { status: statusText } }).catch(playerLogger.error);
            }
          }

          this._isFinished = false;
          this.updateNowplayingMessage();

          if (this.queue[this.nextIndex]) {
            if (!this.queue[this.nextIndex].cache) {
              if (seek == null) {
                playerLogger.debug(`Buffer called at ${(new Error()).stack.split("\n")[1].trimStart().split("\\").pop()}`);
                this.buffer(this.nextIndex).then(() => this._isBuffering = true);
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

                  stream = ytdl(resource.url,
                    {
                      filter         : (format) => format.contentLength,
                      quality        : "highestaudio",
                      highWaterMark  : 1 << 25,
                      requestOptions : {
                        timeout: 3000,
                      },
                      ...(agent && { requestOptions: { agent } }),
                    });
                  break;
                }

                default: break;
              }

              if (stream) {
                await new Promise((resolve, reject) => {
                  const retryTimeout = setTimeout(() => stream.emit("error", new Error("Timeouut")), 3000);
                  playerLogger.info(`⏳ Buffering ${resource.title} ${chalk.gray(this.guild.name)}`);
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

                      playerLogger.info(`🔄 Buffering ${resource.title} ${chalk.gray(this.guild.name)}`);

                      this._isBuffering = false;
                      this.buffer(index, force, _retried + 1);

                      resolve();
                    }
                  });

                  stream.on("finish", async () => {
                  // check duration
                    if (this.current.duration < 0) {
                      const duration = (await ytdl.getBasicInfo(resource.url)).videoDetails.lengthSeconds;
                      resource.duration = +duration;
                      this.client.apiCache.set(resource.id, resource.toJSON());
                      writeFileSync(join(__dirname, "../.cache", `${resource.id}.metadata`), JSON.stringify(resource.toJSON()), { encoding: "utf-8", flag: "w" });
                    }

                    playerLogger.info(`✅ Buffered  ${resource.title} ${chalk.gray(this.guild.name)}`);
                    const _buffer = Buffer.concat(_buf);
                    writeFileSync(join(__dirname, "../.cache/", resource.id), _buffer, { flag: "w" });
                    resource.cache = join(__dirname, "../.cache/", resource.id);
                    stream.destroy();

                    resolve();
                  });
                });
              }
            }
          }
        } else {
          playerLogger.debug(`Resource has cache at ${join(__dirname, "../.cache/", resource.id).replace("C:\\Users\\Kamiya\\Documents\\GitHub\\Kamiya\\kami-music-bot", "")}`);
          resource.cache = join(__dirname, "../.cache/", resource.id);
        }

        // lyrics

        if (resource.lyrics instanceof KamiMusicLyric) {
          if (resource.cache) {
            return;
          }
        }

        if (resource.lyric == null) {
          KamiMusicLyric.searchLyrics(resource.title).then(results => {
            if (results.length) {
              resource.lyric = results[0].id;
              resource.lyricMetadata = results[0];

              if (!existsSync(join(__dirname, "../.cache/", `${resource.lyric}.lyric`))) {
                KamiMusicLyric.fetchLyric(resource.lyric).then(data => {
                  resource.lyrics = new KamiMusicLyric(data);
                  writeFileSync(join(__dirname, "../.cache/", `${resource.lyric}.lyric`), JSON.stringify(data), { flag: "w" });
                  writeFileSync(join(__dirname, "../.cache", `${resource.id}.metadata`), JSON.stringify(resource.toJSON()), { encoding: "utf-8", flag: "w" });
                });
              } else {
                resource.lyrics = new KamiMusicLyric(JSON.parse(readFileSync(join(__dirname, "../.cache/", `${resource.lyric}.lyric`), { encoding: "utf-8" })));
              }
            }
          });
        } else if (!existsSync(join(__dirname, "../.cache/", `${resource.lyric}.lyric`))) {
          KamiMusicLyric.fetchLyric(resource.lyric).then(data => {
            resource.lyrics = new KamiMusicLyric(data);
            writeFileSync(join(__dirname, "../.cache/", `${resource.lyric}.lyric`), JSON.stringify(data), { flag: "w" });
          });
        } else {
          resource.lyrics = new KamiMusicLyric(JSON.parse(readFileSync(join(__dirname, "../.cache/", `${resource.lyric}.lyric`), { encoding: "utf-8" })));
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
    } else if (this.repeat == RepeatMode.Backward || this.repeat == RepeatMode.BackwardRepeatQueue) {
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
    if (this.repeat == RepeatMode.Backward || this.repeat == RepeatMode.BackwardRepeatQueue) {
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
      const lyrics = this._resource ? this._resource.metadata?.lyrics?.getLine(this.playbackTime - this.lyricsOffset) ?? null : null;

      if (this.npmsg) {
        this.npmsg = await this.npmsg.edit(npTemplate(this, lyrics)).catch(async (err) => {
          if (err.code != RESTJSONErrorCodes.UnknownMessage) {
            console.error(err);
          }

          if (!this._npmsglock) {
            this._npmsglock = true;
            this.npmsg = await this.textChannel.send(npTemplate(this, lyrics));
            this._npmsglock = false;
          }
        });
      } else if (!this._npmsglock) {
        this._npmsglock = true;
        this.npmsg = await this.textChannel.send(npTemplate(this, lyrics));
        this._npmsglock = false;
        this._npmsgcollector = this.npmsg.createMessageComponentCollector({ componentType: ComponentType.Button });
        this._npmsgcollector.on("collect", btnInter => {
          switch (btnInter.customId) {
            case "offset-1000": this.lyricsOffset -= 1000; break;
            case "offset-100" : this.lyricsOffset -= 100; break;
            case "offsetReset": this.lyricsOffset = 0; break;
            case "offset+100" : this.lyricsOffset += 100; break;
            case "offset+1000": this.lyricsOffset += 1000; break;
            case "toggleRuby": this.showRubyText = !this.showRubyText; break;
          }

          btnInter.update(npTemplate(this, this._resource ? this._resource.metadata?.lyrics?.getLine(this.playbackTime - this.lyricsOffset) ?? null : null));
        });
      }
    } catch (err) {
      playerLogger.error(`Unable to update nowplaying message in #${this.textChannel.name}`);
      playerLogger.error(err);
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
  const embeds = [player._resource != null ? new EmbedBuilder()
    .setColor(player.client.Color.Info)
    .setAuthor({ name: `正在播放 | ${player.guild.name}`, iconURL: player.guild.iconURL() })
    .setDescription(`${this.locked ? "🔒" : ""} 使用 ${AddByUrlCommandMention} 或 ${AddBySearchCommandMention} 來添加項目`)
    .setThumbnail(current.thumbnail)
    .setTitle(current.title)
    .setURL(current.shortURL)
    .setFields([
      { name: "#️⃣ 編號", value: `${player.currentIndex + 1}`, inline: true },
      { name: "⏲️ 長度", value: current.formattedDuration, inline: true },
    ])
    .setFooter({ text: current.member.displayName, iconURL: current.member.displayAvatarURL() })
    .setTimestamp()
    : new EmbedBuilder()
      .setColor(player.client.Color.Info)
      .setAuthor({ name: `正在播放 | ${player.guild.name}`, iconURL: player.guild.iconURL() })
      .setDescription(`目前沒有在播放任何東西，使用 ${AddByUrlCommandMention} 或 ${AddBySearchCommandMention} 來添加項目`)
      .setTimestamp()];
  const components = [];

  if (lyrics) {
    const ly_prev = codeBlock("md", player.showRubyText ? `${lyrics.prev?.ruby ? `| ${lyrics.prev.ruby}\n` : ""}| ${lyrics.prev?.value ?? ""}${lyrics.prev?.tw ? `\n> ${lyrics.prev.tw}` : ""}` : `| ${lyrics.prev?.raw ?? ""}${lyrics.prev?.tw ? `\n> ${lyrics.prev.tw}` : ""}`);
    const ly_current = codeBlock("md", player.showRubyText ? `${lyrics.current?.ruby ? `# ${lyrics.current.ruby}\n` : ""}# ${lyrics.current?.value ?? ""}${lyrics.current?.tw ? `\n> ${lyrics.current.tw}` : ""}` : `# ${lyrics.current?.raw ?? ""}${lyrics.current?.tw ? `\n> ${lyrics.current.tw}` : ""}`);
    const ly_next = codeBlock("md", player.showRubyText ? `${lyrics.next?.ruby ? `| ${lyrics.next?.ruby}\n` : ""}| ${lyrics.next?.value ?? ""}${lyrics.next?.tw ? `\n> ${lyrics.next.tw}` : ""}` : `| ${lyrics.next?.raw ?? ""}${lyrics.next?.tw ? `\n> ${lyrics.next.tw}` : ""}`);
    embeds.push(new EmbedBuilder()
      .setColor(Colors.DarkGrey)
      .setAuthor({ name: `歌詞${current?.lyricMetadata ? `：${current.lyricMetadata.artistPredict} - ${current.lyricMetadata.titlePredict}` : ""}` })
      .setDescription(
        `${ly_prev}${ly_current}${ly_next}`,
      )
      .setFooter({
        text: `歌詞偏移：${player.lyricsOffset}ms`,
      }));

    components.push(new ActionRowBuilder()
      .addComponents(
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
          .setLabel("+1s"),
      ));
    components.push(new ActionRowBuilder()
      .addComponents(new ButtonBuilder()
        .setCustomId("toggleRuby")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("✏️")
        .setLabel(player.showRubyText ? "隱藏讀音" : "顯示讀音"),
      ));
  }

  return { content: `🎶 正在 ${player.voiceChannel} ${player._resource != null ? "播放" : "待機"}`, embeds, components, flags: MessageFlags.SuppressNotifications };
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

module.exports = { KamiMusicPlayer, EqualizerPresets, RepeatMode };