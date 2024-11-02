import { createReadStream, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream';

import { AudioPlayerStatus, StreamType, VoiceConnectionStatus, createAudioPlayer, createAudioResource, entersState, joinVoiceChannel } from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, MessageFlags, inlineCode } from 'discord.js';
import prism from 'prism-media';

import { logError } from '@/utils/callback';
import Logger from '@/utils/logger';
import { formatDuration, getLyricsAtTime, progress } from '@/utils/resource';
import { formatLines } from '@/utils/string';
import cookies from '~/cookies.json' with { type: 'json' };

import type { KamiClient } from '@/core/client';
import type { KamiLyric, KamiResource } from '@/core/resource';
import type { AudioPlayer, AudioResource, PlayerSubscription, VoiceConnection } from '@discordjs/voice';
import type { DiscordAPIError, Guild, GuildMember, GuildTextBasedChannel, Message, VoiceBasedChannel } from 'discord.js';

const agent = ytdl.createAgent(cookies as []);
const GlobalVolumeModifier = 0.25;

const PlayerControls = (player: KamiMusicPlayer, status?: AudioPlayerStatus) => new ActionRowBuilder<ButtonBuilder>()
  .setComponents(
    new ButtonBuilder()
      .setCustomId('player:control-prev')
      .setEmoji('⏮️')
      .setDisabled(player.currentIndex <= 0)
      .setStyle(ButtonStyle.Secondary),
    status == AudioPlayerStatus.Paused
      ? new ButtonBuilder()
        .setCustomId('player:control-resume')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Secondary)
      : new ButtonBuilder()
        .setCustomId('player:control-pause')
        .setEmoji('⏸️')
        .setDisabled(!player._currentResource)
        .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player:control-next')
      .setEmoji('⏭️')
      .setDisabled(player.currentIndex >= player.queue.length - 1)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player:control-remove')
      .setEmoji('🚮')
      .setDisabled(!player.queue[player.currentIndex])
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player:control-destroy')
      .setEmoji('🚪')
      .setStyle(ButtonStyle.Secondary),
  );

const LyricsOffsetControl = new ActionRowBuilder<ButtonBuilder>()
  .setComponents(
    new ButtonBuilder()
      .setCustomId('player:offset-1s')
      .setLabel('-1s')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player:offset-250ms')
      .setLabel('-250ms')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player:offset-reset')
      .setLabel('🔄️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player:offset+250ms')
      .setLabel('+250ms')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('player:offset+1s')
      .setLabel('+1s')
      .setStyle(ButtonStyle.Secondary),
  );

export enum RepeatMode {
  Forward = 0,
  RepeatQueue = 1,
  RepeatCurrent = 2,
  Random = 3,
  RandomNoRepeat = 4,
  TrueRandom = 5,
  Backward = 6,
  BackwardRepeatQueue = 7,
};

export const RepeatModeName = {
  [RepeatMode.Forward]: '不重複',
  [RepeatMode.RepeatQueue]: '循環',
  [RepeatMode.RepeatCurrent]: '單曲重複',
  [RepeatMode.Random]: '隨機',
  [RepeatMode.RandomNoRepeat]: '隨機（不重複）',
  [RepeatMode.TrueRandom]: '真隨機',
  [RepeatMode.Backward]: '倒序播放',
  [RepeatMode.BackwardRepeatQueue]: '倒序循環',
} as Readonly<Record<RepeatMode, string>>;

export class KamiMusicPlayer {
  client: KamiClient;
  owner: GuildMember;
  text: GuildTextBasedChannel;
  voice: VoiceBasedChannel;
  guild: Guild;
  connection!: VoiceConnection;
  subscription?: PlayerSubscription;
  player?: AudioPlayer;
  message: Message | null = null;

  queue = [] as KamiResource[];
  currentIndex = 0;
  repeat = RepeatMode.Forward;
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

  _random = [] as KamiResource[];
  _transcoder: prism.FFmpeg | null = null;
  _currentResource: AudioResource<KamiResource> | null = null;

  _currentLyrics: KamiLyric | null = null;
  _lyricsOffset = 0;
  _lyricsTimer = setInterval(() => {
    if (!this._currentResource?.metadata?.metadata) return;
    const metadata = this._currentResource.metadata.metadata;

    const { current } = getLyricsAtTime(
      this._currentResource.playbackDuration + this._lyricsOffset,
      metadata.lyrics,
    );

    if (current.from == this._currentLyrics?.from) return;

    this._currentLyrics = current;
    void this.updateMessage(this._currentResource.metadata, true);
  }, 100);

  constructor(
    client: KamiClient,
    owner: GuildMember,
    text: GuildTextBasedChannel,
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
      if (this._transcoder) {
        this._transcoder.destroy();
        this._transcoder = null;
      }
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

  get isPlaying() {
    return this.player?.state.status == AudioPlayerStatus.Playing;
  }

  get paused() {
    return this.player?.state.status == AudioPlayerStatus.Paused || this.player?.state.status == AudioPlayerStatus.AutoPaused;
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

    this.connection.on('error', (error) => {
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
    if (this.isPlaying) {
      this.stop();
    }

    this.currentIndex = index;

    const resource = this.queue[index];

    if (!resource) {
      Logger.error(`Resource at index ${index} is not found`, this.queue.map((v, i) => `${i}. ${v}`).join('\n'));
      return;
    }

    if (!resource.cache) {
      await this.buffer(resource);
    }

    const stream = createReadStream(resource.cache!, {
      highWaterMark: 1 << 25,
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
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      // ...(seek != null ? ["-ss", formatTime(~~(seek / 1000))] : []),
      // "-af", `firequalizer=gain_entry='${Object.keys(this.equalizer).map(k => `entry(${k},${this.equalizer[k]})`).join(";")}',dynaudnorm=n=0:c=1`,
      // "-af", `bass=g=${this.audiofilter.bass}`,
    ];
    this._transcoder = new prism.FFmpeg({ args: transcoderArgs });

    const audioResource = createAudioResource(
      pipeline(stream, this._transcoder, () => void 0),
      {
        inputType: StreamType.Raw,
        inlineVolume: true,
        metadata: resource,
      },
    );
    audioResource.volume!.setVolume(this.volume);

    this._currentResource = audioResource;
    this.player?.play(audioResource);

    this.updateMessage(resource).catch(logError);
    this.updateVoiceStatus(resource).catch(logError);

    Logger.debug(`Playing ${resource} at index ${index} in ${this.guild}`);

    return resource;
  }

  async buffer(resource: KamiResource): Promise<boolean> {
    const cachePath = join(this.client.cacheFolderPath, 'audio', resource.id);

    if (existsSync(cachePath)) {
      resource.cache = cachePath;
      return true;
    }

    try {
      Logger.debug(`Start buffering resource ${resource}`);

      const stream = ytdl(resource.url, {
        agent,
        filter: (format) => +format.contentLength > 0,
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
      // ...(agent && { requestOptions : { agent } }),
      });

      const data = await new Response(stream).arrayBuffer();

      writeFileSync(cachePath, new Uint8Array(data));
      resource.cache = cachePath;

      Logger.debug(`Buffered resource ${resource} at ${cachePath}`);
      return true;
    }
    catch (error) {
      Logger.error('Error while buffering', error, resource);
      return false;
    }
  }

  forward() {
    switch (this.repeat) {
      case RepeatMode.Forward: {
        if (this.currentIndex < this.queue.length - 1) {
          this.currentIndex++;
        }
        else {
          this.stop();
          void this.updateMessage();
          void this.updateVoiceStatus();
          return;
        }

        break;
      }

      case RepeatMode.RepeatQueue: {
        if (this.currentIndex < this.queue.length - 1) {
          this.currentIndex++;
        }
        else {
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
        }
        else {
          this.stop();
          void this.updateMessage();
          void this.updateVoiceStatus();
          return;
        }

        break;
      }

      case RepeatMode.BackwardRepeatQueue: {
        if (this.currentIndex > 0) {
          this.currentIndex--;
        }
        else {
          this.currentIndex = this.queue.length - 1;
        }
        break;
      }
    }

    void this.play(this.currentIndex);
    return this.queue[this.currentIndex];
  }

  backward() {
    switch (this.repeat) {
      case RepeatMode.Forward: {
        if (this.currentIndex > 0) {
          this.currentIndex--;
        }
        else {
          this.stop();
          void this.updateMessage();
          void this.updateVoiceStatus();
          return;
        }

        break;
      }

      case RepeatMode.RepeatQueue: {
        if (this.currentIndex > 0) {
          this.currentIndex--;
        }
        else {
          this.currentIndex = this.queue.length - 1;
        }
        break;
      }

      case RepeatMode.RepeatCurrent: {
        break;
      }

      case RepeatMode.Random:
      case RepeatMode.RandomNoRepeat:
      case RepeatMode.TrueRandom: {
        return;
      }

      case RepeatMode.Backward: {
        if (this.currentIndex < this.queue.length - 1) {
          this.currentIndex++;
        }
        else {
          this.stop();
          void this.updateMessage();
          void this.updateVoiceStatus();
          return;
        }

        break;
      }

      case RepeatMode.BackwardRepeatQueue: {
        if (this.currentIndex < this.queue.length - 1) {
          this.currentIndex++;
        }
        else {
          this.currentIndex = 0;
        }
        break;
      }
    }

    void this.play(this.currentIndex);
    return this.queue[this.currentIndex];
  }

  stop() {
    this._transcoder?.destroy();
    this.player?.stop();
    this._currentResource = null;
  }

  addResource(resource: KamiResource | KamiResource[], index: number = this.queue.length) {
    const current = this.queue[this.currentIndex];

    if (!Array.isArray(resource)) {
      resource = [resource];
    }

    this.queue.splice(index, 0, ...resource);

    if (this.isPlaying && this._currentResource) {
      this.currentIndex = this.queue.indexOf(current);
      void this.updateMessage(this._currentResource.metadata, true);
    }
    else {
      this.currentIndex = this.queue.indexOf(resource[0]);
      void this.play();
    }
  }

  removeResource(index: number) {
    const resource = this.queue[index];
    if (!resource) return;

    let shouldPlay = false;

    if (index == this.currentIndex) {
      this.stop();
      shouldPlay = true;
    }

    if (index < this.currentIndex) {
      this.currentIndex--;
    }

    const removed = this.queue.splice(index, 1)[0];

    if (this.currentIndex >= this.queue.length) {
      this.currentIndex = this.queue.length - 1;
      shouldPlay = false;
    }

    if (shouldPlay) {
      void this.play();
    }

    return removed;
  }

  clearResources() {
    const removed = this.queue.splice(0, this.queue.length);
    this.currentIndex = 0;
    this._currentResource = null;

    if (this.isPlaying) {
      this.player?.stop();
    }

    return removed;
  }

  async updateVoiceStatus(resource?: KamiResource) {
    const statusText = resource ? `🎵 ${resource.title}` : '';

    await this.client.rest
      .put(
        `/channels/${this.voice.id}/voice-status`,
        {
          body: {
            status: statusText,
          },
        })
      .catch(logError);
  }

  async updateMessage(resource?: KamiResource, edit = false) {
    const embed = new EmbedBuilder()
      .setColor(Colors.Blue)
      .setAuthor({
        name: `正在播放 | ${this.guild.name}`,
        iconURL: this.guild.iconURL() ?? undefined,
      })
      .setTimestamp();
    const components = [];

    let content = '';

    if (!resource) {
      embed
        .setDescription('目前沒有在播放任何東西，使用 /add 來添加項目');

      components.push(PlayerControls(this, this.player?.state.status));
    }
    else {
      embed
        .setThumbnail(resource.thumbnail)
        .setTitle(resource.title)
        .setURL(resource.url)
        .setDescription('使用 /add 來添加項目')
        .setFields(
          {
            name: '#️⃣ 編號　　​',
            value: `${this.currentIndex + 1}`,
            inline: true,
          },
          {
            name: '⌛ 長度　　​',
            value: resource.getLength(),
            inline: true,
          },
          {
            name: '🔁 循環模式',
            value: RepeatModeName[this.repeat],
            inline: true,
          },
        )
        .setFooter({
          text: `由 ${resource.member?.displayName} 添加`,
          iconURL: resource.member?.displayAvatarURL(),
        });

      components.push(PlayerControls(this, this.player?.state.status));

      if (resource.metadata && this._currentResource) {
        const playback = resource.length
          ? [
            inlineCode(formatDuration(this._currentResource.playbackDuration)),
            progress((this._currentResource.playbackDuration / resource.length) * 100),
            inlineCode(resource.getLength()),
          ].join(' ')
          : 'LIVE';

        embed.setDescription(playback)
          .setFooter({
            text: `由 ${resource.member?.displayName} 添加 | 使用 /add 來添加項目`,
            iconURL: resource.member?.displayAvatarURL(),
          });

        const lyrics = getLyricsAtTime(
          this._currentResource.playbackDuration + this._lyricsOffset,
          resource.metadata.lyrics,
        );

        const showRuby = resource.metadata.hasRuby;
        const showTranslation = resource.metadata.script != 'zh';

        const prev = formatLines(lyrics.prev, false, showRuby, showTranslation);
        const current = formatLines(lyrics.current, true, showRuby, showTranslation);
        const next = formatLines(lyrics.next, false, showRuby, showTranslation);

        content = [
          prev, current, next,
        ].join('\n-# ​\n');

        components.push(LyricsOffsetControl);
      }
    }

    if (edit) {
      if (!this.message) return;
      await this.message.edit({
        content,
        embeds: [embed],
        components,
      }).catch((e: DiscordAPIError) => {
        if (e.code == 10008) {
          this.message = null;
        };
      });
      return;
    }

    if (this.message && !edit) {
      await this.message.delete().catch(logError);
    }

    this.message = await this.text.send({
      content,
      embeds: [embed],
      components,
      flags: MessageFlags.SuppressNotifications,
      options: {
        fetchReply: true,
      },
    });
  }

  canInteract(member: GuildMember) {
    return !this.locked || this.owner.id == member.id;
  }

  destroy() {
    if (this.message) {
      void this.message.delete().catch(logError);
    }

    clearInterval(this._lyricsTimer);
    this.subscription?.unsubscribe();
    this.connection.destroy();
    this.client.players.delete(this.guild.id);
    this.destroyed = true;
  }
}
