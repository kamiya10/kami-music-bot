import { AudioPlayerStatus, StreamType, VoiceConnectionStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel } from "@discordjs/voice";
import { createReadStream, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { pipeline } from "stream";

import Logger from "@/utils/logger";
import cookies from "~/cookies.json";
import prism from "prism-media";
import ytdl from "@distube/ytdl-core";

import type { AudioPlayer, AudioResource, PlayerSubscription, VoiceConnection } from "@discordjs/voice";
import type { Guild, GuildMember, Message, TextBasedChannel, VoiceBasedChannel } from "discord.js";
import type { KamiClient } from "@/core/KamiClient";
import type { KamiResource } from "@/core/KamiResource";

const agent = ytdl.createAgent(cookies as []);
const GlobalVolumeModifier = 0.25;

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
  
  _volume = 1;
  public get volume() {
    return this._volume * GlobalVolumeModifier;
  }
  public set volume(v) {
    this._volume = v;
  }
  
  _random = [] as Array<KamiResource>;
  _transcoder: prism.FFmpeg | null = null;
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

    this.player.on(AudioPlayerStatus.Idle, (oldState) => {
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

  async play(index = this.currentIndex) {
    const resource = this.queue[index];

    if (!resource) {
      return Logger.error(`Resource at index ${index} is not found`, this.queue, this);
    }

    if (!resource.cache) {
      await this.buffer(resource);
    }

    /*
    if (!resource.cache) {
      if (!await this.buffer(index)) {
        return this.forward();
      }
    }
    */
    
    const stream = createReadStream(resource.cache!, {
      highWaterMark : 1 << 25,
    });

    /* 
    const stream = ytdl(resource.url, {
      agent,
      filter        : (format) => {
        console.log(format);
        return +format.contentLength > 0;
      },
      quality       : "highestaudio",
      highWaterMark : 1 << 25,
      // ...(agent && { requestOptions : { agent } }),
    }); */

    const transcoderArgs = [
      "-analyzeduration", "0",
      "-loglevel", "0",
      "-f", "s16le",
      "-ar", "48000",
      "-ac", "2",
      // ...(seek != null ? ["-ss", formatTime(~~(seek / 1000))] : []),
      // "-af", `firequalizer=gain_entry='${Object.keys(this.equalizer).map(k => `entry(${k},${this.equalizer[k]})`).join(";")}',dynaudnorm=n=0:c=1`,
      // "-af", `bass=g=${this.audiofilter.bass}`,
    ];
          
    const transcoder = new prism.FFmpeg({ args: transcoderArgs });

    const audioResource = createAudioResource(
      // @ts-expect-error type conversion between node and web always fucked up
      pipeline(stream, transcoder, () => void 0),
      {
        inputType    : StreamType.Raw,
        inlineVolume : true,
        metadata     : resource,
      },
    );
    
    audioResource.volume!.setVolume(this.volume);

    this._currentResource = audioResource;

    this.player?.play(audioResource);
  }

  async buffer(resource: KamiResource): Promise<void> {
    const cachePath = join(this.client.cacheDirectory, "audio", resource.id);

    if (existsSync(cachePath)) {
      resource.cache = cachePath;
      return;
    }

    try {
      Logger.debug(`Start buffering resource ${resource}`);

      const stream = ytdl(resource.url, {
        agent,
        filter        : (format) => +format.contentLength > 0,
        quality       : "highestaudio",
        highWaterMark : 1 << 25,
      // ...(agent && { requestOptions : { agent } }),
      });

      const data = await new Response(stream).arrayBuffer();
      
      writeFileSync(cachePath, new Uint8Array(data));
      resource.cache = cachePath;
      
      Logger.debug(`Buffered resource ${resource} at ${cachePath}`, resource);
    } catch (error) {
      Logger.error("Error while buffering", error, resource);
      throw new Error("Error while buffering");
    }
  }

  forward() {
    switch (this.repeat) {
      case RepeatMode.Forward: {
        if (this.currentIndex < this.queue.length - 1) {
          this.currentIndex++;
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
        if (this.currentIndex < this.queue.length - 1) {
          this.currentIndex++;
        } else {
          this.currentIndex = 0;
        }
        break;
      }

      case RepeatMode.RepeatCurrent: {
        break;
      }

      case RepeatMode.Random: {
        this.currentIndex = Math.floor(
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
        this.currentIndex = this.queue.indexOf(resource!);
        break;
      }

      case RepeatMode.Backward: {
        if (this.currentIndex > 0) {
          this.currentIndex--;
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
        if (this.currentIndex > 0) {
          this.currentIndex--;
        } else {
          this.currentIndex = this.queue.length - 1;
        }
        break;
      }

      default:
        break;
    }

    void this.play(this.currentIndex);
  }

  addResource(resource: KamiResource | KamiResource[], index: number = this.queue.length) {
    Logger.debug(`Adding player ${resource.length} resources at ${index}`, resource);

    if (!Array.isArray(resource)) {
      resource = [resource];
    } 
    
    this.queue.splice(index, 0, ...resource);

    if (this.player?.state.status == AudioPlayerStatus.Idle) {
      void this.play(index);
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