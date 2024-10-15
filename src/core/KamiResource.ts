import { existsSync } from 'fs';
import { join } from 'path';

import type { KamiClient } from "./KamiClient";
import type { Video } from "@/api/youtube/video";

interface KamiResourceOptions {
  type: Platform;
  id: string;
  title: string;
  length: number;
  url: string;
}

export class KamiResource {
  type: Platform;
  id: string;
  title: string;
  length: number;
  url: string;
  cache: string | null = null;
  
  constructor(client: KamiClient, options: KamiResourceOptions) {
    this.type = options.type;
    this.id = options.id;
    this.title = options.title;
    this.length = options.length;
    this.url = options.url;

    const cachePath = join(client.cacheDirectory, "audio", options.id);

    if (existsSync(cachePath)) {
      this.cache = cachePath;
    }
  }

  static youtube(client: KamiClient, video: Video): KamiResource {
    return new KamiResource(client, {
      type: Platform.YouTube,
      id: video.id,
      title: video.title,
      length: video.length,
      url: video.shortUrl,
    });
  }

  toString() {
    return `${this.title} (${this.id})`;
  }
}

export enum Platform {
  YouTube = "youtube",
}