import { AudioPlayerStatus, StreamType, VoiceConnectionStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel } from "@discordjs/voice";
import { FFmpeg } from "prism-media";
import { join } from "path";

import Logger from "@/utils/logger";
import cookies from "~/cookies.json";
import ytdl from "@distube/ytdl-core";

import type { AudioPlayer, AudioResource, PlayerSubscription, VoiceConnection } from "@discordjs/voice";
import type { Guild, GuildMember, Message, TextBasedChannel, VoiceBasedChannel } from "discord.js";
import type { KamiClient } from "@/core/KamiClient";
import type { KamiResource } from "@/core/KamiResource";

const agent = ytdl.createAgent(cookies as []);

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

export class KamiMusicPlayer {
  client: KamiClient;
  owner: GuildMember;
  text: TextBasedChannel;
  voice: VoiceBasedChannel;
  guild: Guild;
  connection!: VoiceConnection;
  subscription?: PlayerSubscription;
  player?: AudioPlayer;
  message: Message | null = null;
  
  queue = [] as Array<KamiResource>;
  currentIndex = 0;
  repeat = RepeatMode.Forward;
  paused = false;
  stopped = false;
  locked = false;
  destroyed = false;
  
  _random = [] as Array<KamiResource>;
  _transcoder: FFmpeg | null = null;
  _currentResource: AudioResource<KamiResource> | null = null;

  constructor(
    client: KamiClient,
    owner: GuildMember,
    text: TextBasedChannel,
    voice: VoiceBasedChannel,
  ) {
    this.client = client;
    this.owner = owner;
    this.text = text;
    this.voice = voice;
    this.guild = voice.guild;
    this.connect();

    this.player = createAudioPlayer();

    this.subscription = this.connection?.subscribe(this.player);

    this.player.on(AudioPlayerStatus.Idle,   (oldState) => {
      this._currentResource = null;
      /* 
        if (this.preference.updateVoiceStatus) {
          this.updateVoiceStatus();
        }
      */

      // Playback has finished
      if (oldState.status == AudioPlayerStatus.Playing) {
        if (!this.paused && !this.stopped) {
          if (this.message) {
            void this.message.delete();
            this.message = null;
          }

          if (this.queue.length > 0) {
            this.forward();
          }
        }

        this.stopped = false;
      }
    });

    Logger.debug(`Created audio player for guild ${this.guild}`);
  }

  connect(channel: VoiceBasedChannel = this.voice) {
    this.connection?.destroy();

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

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
      Logger.error(error.message, error, this);
    });

    this.voice = channel;
  }

  /* 
  setupTranscoder() {
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
  }
 */

  play(index = this.currentIndex) {
    const resource = this.queue[index];

    if (!resource) {
      return Logger.error(`Resource at index ${index} is not found`, this.queue, this);
    }
    /* 
    if (!resource.cache) {
      if (!await this.buffer(index)) {
        return this.forward();
      }
    }

    const stream = createReadStream(resource.cache!, {
      highWaterMark : 1 << 25,
    }); */
    
    const stream = ytdl(resource.url, {
      agent,
      filter        : (format) => +format.contentLength > 0,
      quality       : "highestaudio",
      highWaterMark : 1 << 25,
      // ...(agent && { requestOptions : { agent } }),
    });

    this._currentResource = createAudioResource(
      stream,
      {
        inputType    : StreamType.Raw,
        inlineVolume : true,
        metadata     : resource,
      },
    );
  }

  buffer(index = this.currentIndex): Promise<boolean> {
    return new Promise((resolve) => {
      const resource = this.queue[index];
      const cachePath = join(this.client.cacheDirectory, "audio", resource.id);

      const data = [] as Array<Buffer>;

      Logger.debug(`Start buffering resource ${resource}`);

      const stream = ytdl(resource.url, {
        agent,
        filter        : (format) => +format.contentLength > 0,
        quality       : "highestaudio",
        highWaterMark : 1 << 25,
      // ...(agent && { requestOptions : { agent } }),
      });
    
      stream.on("data", (chunk: Buffer) => data.push(chunk));
      
      stream.on("end", () => {
        Logger.debug(`Buffered resource ${resource} at ${cachePath}`, resource);
        Bun.write(cachePath,data)
          .then(() => {
            resource.cache = cachePath;
            resolve(true);
          })
          .catch((err) => {
            Logger.error("Error while saving buffer", err, resource);
            resolve(false);
          });
      });

      stream.on("error", (err) => {
        Logger.error("Error while buffering", err, resource);
        resolve(false);
      });
    });
  }

  forward() {
    let index = this.currentIndex;

    switch (this.repeat) {
      case RepeatMode.Forward: {
        if (index < this.queue.length - 1) {
          index++;
        } else {
          /* //? TODO 
            this._isFinished = true;
            void this.updateNowplayingMessage();
           */
          return;
        }

        break;
      }

      case RepeatMode.RepeatQueue: {
        if (index < this.queue.length - 1) {
          index++;
        } else {
          index = 0;
        }
        break;
      }

      case RepeatMode.RepeatCurrent: {
        break;
      }

      case RepeatMode.Random: {
        index = Math.floor(
          Math.random() * this.queue.length,
        );
        break;
      }

      case RepeatMode.RandomNoRepeat: {
        if (this._random.length == 0) {
          this._random = [...this.queue];
        }

        this._random = this._random.sort(
          () => 0.5 - Math.random(),
        );
        const resource = this._random.shift();
        index = this.queue.indexOf(resource!);
        break;
      }

      case RepeatMode.Backward: {
        if (index > 0) {
          index--;
        } else {
          /* //? TODO 
            this._isFinished = true;
            void this.updateNowplayingMessage();
           */
          return;
        }

        break;
      }

      case RepeatMode.BackwardRepeatQueue: {
        if (index > 0) {
          index--;
        } else {
          index = this.queue.length - 1;
        }
        break;
      }

      default:
        break;
    }

    this.play(index);
  }

  addResource(resource: KamiResource | KamiResource[], index: number = this.queue.length) {
    Logger.debug(`Adding player ${resource.length} resources at ${index}`, resource);

    if (!Array.isArray(resource)) {
      resource = [resource];
    } 
    
    this.queue.splice(index, 0, ...resource);

    if (this.player?.state.status == AudioPlayerStatus.Idle) {
      this.play(index);
    }
  }

  destroy() {
    if (this.message) {
      void this.message.delete().catch(() => void 0);
    }

    this.subscription?.unsubscribe();
    this.connection.destroy();
    this.client.players.delete(this.guild.id);
    this.destroyed = true;
  }
}