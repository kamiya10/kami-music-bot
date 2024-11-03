import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { cleanupTitle, formatDuration, getMetadata } from '@/utils/resource';

import type { GuildMember } from 'discord.js';
import type { KamiClient } from './client';
import type { RubyText } from '@/utils/string';
import type { Video } from '@/api/youtube/video';

export interface KamiLyric {
  from: number;
  to: number;
  line: RubyText[];
  translation: string;
}

export interface KamiMetadataJson {
  $schema: string;
  title: string;
  album: string;
  cover: string;
  artist: string[];
  composer: string[];
  arranger: string[];
  lyricist: string[];
  diskNo: number;
  trackNo: number;
  year: number;
  script: string;
  source: string;
  tags: string[];
  lyrics: {
    from: number;
    to: number;
    line: string;
    translation: string;
  }[];
}

export interface KamiMetadata {
  title: string;
  album: string;
  cover: string;
  artist: string[];
  composer: string[];
  arranger: string[];
  lyricist: string[];
  diskNo: number;
  trackNo: number;
  year: number;
  script: string;
  source: string;
  tags: string[];
  lyrics: KamiLyric[];
  hasRuby: boolean;
}

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
  metadata: KamiMetadata | null = null;
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

    this.metadata = getMetadata(options.title);
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
