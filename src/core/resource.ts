import { cleanupTitle, formatDuration } from '@/utils/resource';
import { existsSync } from 'fs';
import { join } from 'path';

import type { GuildMember } from 'discord.js';
import type { KamiClient } from './client';
import type { Video } from '@/api/youtube/video';

interface KamiResourceOptions {
  type: Platform;
  id: string;
  title: string;
  length: number | null;
  url: string;
  thumbnail: string;
}

export class KamiResource {
  type: Platform;
  id: string;
  title: string;
  length: number | null;
  url: string;
  thumbnail: string;
  cache: string | null = null;
  member?: GuildMember;

  constructor(client: KamiClient, options: KamiResourceOptions) {
    this.type = options.type;
    this.id = options.id;
    this.title = cleanupTitle(options.title);
    this.length = options.length;
    this.url = options.url;
    this.thumbnail = options.thumbnail;

    const cachePath = join(client.cacheFolderPath, 'audio', options.id);

    if (existsSync(cachePath)) {
      this.cache = cachePath;
    }
  }

  setMember(member: GuildMember) {
    this.member = member;
    return this;
  }

  static youtube(client: KamiClient, video: Video): KamiResource {
    return new KamiResource(client, {
      type: Platform.YouTube,
      id: video.id,
      title: video.title,
      length: video.length,
      url: video.shortUrl,
      thumbnail: video.thumbnail.url,
    });
  }

  getLength() {
    if (!this.length) return 'N/A';
    return formatDuration(this.length);
  }

  toString() {
    return `${this.title} (${this.id})`;
  }

  toJSON() {
    return {
      type: this.type,
      id: this.id,
      title: this.title,
      length: this.length,
      url: this.url,
    };
  }
}

export enum Platform {
  YouTube = 'youtube',
}
