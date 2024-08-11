import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  ComponentType,
  EmbedBuilder,
  Message,
  MessageFlags,
  REST,
  RESTJSONErrorCodes,
  codeBlock,
} from "discord.js";
import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from "@discordjs/voice";
import { KamiMusicMetadata, Platform } from "@/class/KamiMusicMetadata";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  writeFileSync,
} from "fs";
import { EuqalizerPresets } from "@/class/EqualizerGraph";
import { FFmpeg } from "prism-media";
import { KamiClient } from "@/class/KamiClient";
import { inspect } from "bun";
import { join } from "path";
import { pipeline } from "stream";

import Logger from "@/core/logger";
import chalk from "chalk";
import ytdl from "@distube/ytdl-core";

import type { AudioPlayer, AudioResource, PlayerSubscription, VoiceConnection } from "@discordjs/voice";
import type { Guild,GuildMember, MessageCreateOptions, MessageEditOptions, MessagePayload, TextBasedChannel, VoiceBasedChannel } from "discord.js";
import type { EqualizerGraph } from "@/class/EqualizerGraph";
import type { Readable } from "stream";

// const { FFmpeg } = require("prism-media");

const rest = new REST().setToken(process.env["DISCORD_TOKEN"]!);

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
  client                 : KamiClient;
  voice                  : VoiceBasedChannel;
  text                   : TextBasedChannel;
  guild                  : Guild;
  owner                  : GuildMember;
  preference             : KamiMusicPlayerPreference;
  queue                  : KamiMusicMetadata[] = [];
  stopped                : boolean             = false;
  connection             : VoiceConnection;
  player                 : AudioPlayer;
  subscription           : PlayerSubscription;
  private message        : Message | null       = null;
  private destroyed      : boolean              = false;
  private _lyricTimer    : Timer | null         = null;
  private _currentIndex  : number               = 0;
  private _locked        : boolean              = false;
  private _isBuffering   : boolean              = false;
  private _isFinished    : boolean              = false;
  private _random        : KamiMusicMetadata[]  = [];
  private _transcoder    : Readable | null      = null;
  private _audioResource : AudioResource | null = null;

  constructor(client: KamiClient, text: TextBasedChannel, voice: VoiceBasedChannel, owner: GuildMember) {
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

    this.subscription = this.connection.subscribe(this.player)!;

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
      if (!this._audioResource.metadata.lyric) return;
      if (this._lyricTimer) return;

      this._lyricTimer = setInterval(() => {
        if (!this.playbackTime) return;
        try {
          const offsetTime = this.playbackTime - this.lyricsOffset;

          const index =
                  this._audioResource.metadata.lyrics.getIndex(offsetTime);

          if (this._currentLyricIndex != index) {
            this._currentLyricIndex = index;
            this.updateNowplayingMessage();
          }
        } catch (error) {
          // ignoring all errors here because it will be spammy in the console
        }
      }, 10);
    });

    this.player.on(AudioPlayerStatus.Idle,   (oldState) => {
      this._audioResource = null;

      if (this.preference.updateVoiceStatus) {
        this.updateVoiceStatus();
      }

      if (oldState.status == AudioPlayerStatus.Playing) {
        if (!this.paused && !this.stopped) {
          if (this.message instanceof Message) {
            void this.message.delete();
            this.message = null;
          }

          if (this.queue.length > 0) {
            switch (this.repeat) {
              case RepeatMode.Forward: {
                if (this.currentIndex < this.queue.length - 1) {
                  this.next();
                } else {
                  this._isFinished = true;
                  void this.updateNowplayingMessage();
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
                if (this._random.length == 0) {
                  this._random = [...this.queue];
                }

                this._random = this._random.sort(
                  () => 0.5 - Math.random()
                );
                const resource = this._random.shift();
                this.currentIndex = this.queue.indexOf(resource);

                this.play();
                break;
              }

              case RepeatMode.Backward: {
                if (this.currentIndex > 0) {
                  this.next();
                } else {
                  this._isFinished = true;
                  void this.updateNowplayingMessage(true);
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
      this._audioResource = null;

      if (this.current?.error?.message != error.message) {
        this.current.error = error;
        this.play();
      } else if (
        (this.repeat == RepeatMode.Forward &&
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

    if (this._audioResource) {
      void this._audioResource.volume.setVolume(
        this._volume / (1 / GlobalVolumeAdjustment)
      );
    }
  }

  get volume() {
    return this.preference.volume;
  }

  set equalizer(value) {
    this.preference.equalizer = value;

    if (this._audioResource) {
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
    return this._audioResource?.playbackDuration ?? null;
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

  async play(index = this.currentIndex, seek?: number) {
    this.currentIndex = index;

    if (typeof seek != "number") {
      await this.buffer(index);
      this._isBuffering = false;
    }

    const resource = this.queue[index];

    if (!resource) {
      throw new Error(`Resource at ${index} doesn't exists.\n${inspect(this.queue,{colors : true})}`);
    }
      
    let stream;

    if (resource.cachePath) {
      stream = createReadStream(resource.cachePath, {
        highWaterMark : 1 << 25,
      });
    }

    if (!stream) {
      switch (resource.platform) {
        case Platform.Youtube: {
          /* Proxy
            let agent;

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
              headersTimeout : 5000,
            },
            // ...(agent && { requestOptions : { agent } }),
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

      this._audioResource = ar;

      if (seek != null) {
        this._audioResource.playbackDuration = seek;
      }

      this.volume = this.preference.volume;
      this.player.play(ar);

      if (seek == null) {
        Logger.info(
          `▶ Playing ${resource.title} ${chalk.gray(this.guild.name)}`
        );

        if (this.preference.updateVoiceStatus) {
          const statusText = `🎵 ${resource.title}`;

          // TODO: Wait for discord.js to implement method for updating channel status
          await rest
            .put(`/channels/${this.voice.id}/voice-status`, {
              body : { status : statusText },
            })
            .catch((e) => Logger.error(e));
        }
      }

      this._isFinished = false;
      await this.updateNowplayingMessage();

      if (this.queue[this.nextIndex]) {
        if (!this.queue[this.nextIndex].cachePath) {
          if (seek == null) {
            void this.buffer(this.nextIndex).then(
              () => (this._isBuffering = true)
            );
          }
        }
      }
    }
        
  }

  async buffer(index: number, force = false) {
    const resource = this.queue[index];

    if (!resource) {
      throw new Error(`Cannot buffer at index ${index}, resouce does not exists.\n${inspect(this.queue, {colors : true})}`);
    }

    const filePath = join(KamiClient.CacheFolder, resource.id);

    if (existsSync(filePath) && !force) {
      Logger.debug(`Resource ${resource.id} is already cached, skipping.`);
      return;
    }

    let stream: Readable;

    switch (resource.platform) {
      case Platform.Youtube: {
        /* Proxy
          let agent;

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
          filter        : (format) => +format.contentLength > 0,
          quality       : "highestaudio",
          highWaterMark : 1 << 25,
          // ...(agent && { requestOptions : { agent } }),
        });
        break;
      }

      default: 
        return;
    }

    Logger.info(
      `⏳ Buffering ${resource.title} ${chalk.gray(this.guild.name)}`
    );

    const data = [];

    stream.on("data", (chunk) => {
      data.push(chunk);
    })

    stream.on("close",()=>{
      console.log("close");
    })

    stream.on("finish", () => {
      Logger.info(`✅ Buffered  ${resource.title} ${chalk.gray(this.guild.name)}`);

      resource.cachePath = filePath;
    });
  }

  /**
   * Play the next resource.
   * @returns  The resource to be played.
   */
  next() {
    if (this.repeat == RepeatMode.RandomNoRepeat) {
      if (this._random.length == 0) {
        this._random = [...this.queue];
      }

      this._random.sort(() => 0.5 - Math.random());

      const resource = this._random.shift()!;
      this.currentIndex = this.queue.indexOf(resource);
    } else if (
      this.repeat == RepeatMode.Backward ||
      this.repeat == RepeatMode.BackwardRepeatQueue
    ) {
      this.currentIndex -= 1;
    } else {
      this.currentIndex += 1;
    }

    void this.play();
    return this.current;
  }

  /**
   * Play the previous resource.
   * @returns  The resource to be played.
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

    void this.play();
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
   * @param  force If `true`, the player won't transition into the next resource.
   */
  stop(force = false) {
    if (force) {
      this.stopped = true;
    }

    this.player.stop();
    this._audioResource = null;
  }

  /**
   * Destroys the player.
   */
  destroy() {
    if (this.message instanceof Message) {
      void this.message.delete().catch(() => void 0);
    }

    this.subscription.unsubscribe();
    this.connection.destroy();
    this.client.players.delete(this.guild.id);
  }

  connect(channel = this.voice) {
    if (this.connection) {
      this.connection.rejoin();
    } else {
      this.connection = joinVoiceChannel({
        channelId      : channel.id,
        guildId        : channel.guild.id,
        adapterCreator : channel.guild.voiceAdapterCreator,
      });
    }

    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.subscription = this.connection.subscribe(this.player)!;
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
    if (!this.message) {
      this.message = await this.text.send({
        ...nowPlayingMessagePayload(this),
        flags : MessageFlags.SuppressNotifications,
      });
      return;
    }

    await this.message.edit(nowPlayingMessagePayload(this));
  }

  async updateVoiceStatus() {
    // TODO: Wait for discord.js to implement method for updating channel status
    await rest
      .put(`/channels/${this.voice.id}/voice-status`, {
        body : { status : "" },
      })
      .catch((e) => Logger.error(e));
  }
}

const nowPlayingMessagePayload = (player: KamiMusicPlayer, lyrics?): MessageCreateOptions & MessageEditOptions => {
  const current = player.current;
  const embeds = [
    player._resource != null
      ? new EmbedBuilder()
        .setColor(Colors.Blue)
        .setAuthor({
          name    : `正在播放 | ${player.guild.name}`,
          iconURL : player.guild.iconURL()!,
        })
        .setDescription(
          `${player.locked ? "🔒" : ""} 使用 ${AddByUrlCommandMention} 或 ${AddBySearchCommandMention} 來添加項目`
        )
        .setThumbnail(current.thumbnail)
        .setTitle(current.title)
        .setURL(current.shortUrl ?? current.url)
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
        .setColor(Colors.Blue)
        .setAuthor({
          name    : `正在播放 | ${player.guild.name}`,
          iconURL : player.guild.iconURL()!,
        })
        .setDescription(
          `目前沒有在播放任何東西，使用 ${AddByUrlCommandMention} 或 ${AddBySearchCommandMention} 來添加項目`
        )
        .setTimestamp(),
  ];
  /* 
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
 */

  return {
    content : `🎶 正在 ${player.voice.toString()} ${player.player.state.status == AudioPlayerStatus.Playing ? "播放" : "待機"}`,
    embeds,
  };
};

function formatTime(seconds: number) {
  let str = "";
  const second = ~~(seconds % 60);
  const minute = ~~(seconds / 60);
  const hour = ~~(minute / 60);

  str += `${hour.toString().padStart(2, "0")}:`;
  str += `${minute.toString().padStart(2, "0")}:`;
  str += `${second.toString().padStart(2, "0")}`;

  return str;
}
