import { SoundCloud as sc } from 'scdl-core';

import { fetchVideo, parseUrl } from '@/api/youtube';
import { KamiResource } from '@/core/resource';
import Logger from '@/utils/logger';
import { tryCatch } from '@/utils/tryCatch';

import type { KamiClient } from '@/core/client';

interface BaseResourceResolver {
  canHandle(url: string): boolean;
  resolve(url: string): Promise<KamiResource | null>;
}

class YouTubeResolver implements BaseResourceResolver {
  constructor(private client: KamiClient) {}

  canHandle(url: string): boolean {
    const ids = parseUrl(url);
    return ids.video !== null;
  }

  async resolve(url: string): Promise<KamiResource | null> {
    try {
      const { video: id } = parseUrl(url);
      if (!id) return null;

      const video = await fetchVideo(id);
      if (!video.duration) return null;

      return KamiResource.youtube(this.client, video);
    }
    catch (error) {
      Logger.error('Error while resolving YouTube resource', error);
      return null;
    }
  }
}

class SoundCloudResolver implements BaseResourceResolver {
  constructor(private client: KamiClient) {}

  canHandle(url: string): boolean {
    const [error, result] = tryCatch.sync(() => new URL(url));
    if (error) return false;

    return [
      'soundcloud.com',
      'www.soundcloud.com',
    ].includes(result.hostname);
  }

  async resolve(url: string): Promise<KamiResource | null> {
    try {
      const track = await sc.tracks.getTrack(url);
      if (!track.streamable) return null;
      return KamiResource.soundcloud(this.client, track);
    }
    catch (error) {
      Logger.error('Error while resolving SoundCloud resource', error);
      return null;
    }
  }
}

export class ResourceResolver {
  private resolvers: BaseResourceResolver[];

  constructor(client: KamiClient) {
    this.resolvers = [
      new YouTubeResolver(client),
      new SoundCloudResolver(client),
    ];
  }

  async resolve(url: string): Promise<KamiResource | null> {
    const resolver = this.resolvers.find((r) => r.canHandle(url));
    if (!resolver) {
      Logger.debug(`No resolver found for URL: ${url}`);
      return null;
    }

    return resolver.resolve(url);
  }

  registerResolver(resolver: BaseResourceResolver) {
    this.resolvers.push(resolver);
  }
}
