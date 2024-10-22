import { parse, toSeconds } from 'iso8601-duration';

import type { APIThumbnail, Thumbnail } from './thumbnail';
import type { Duration } from 'iso8601-duration';

export interface APIVideo {
  kind: 'youtube#video';
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: APIThumbnail;
      medium: APIThumbnail;
      high: APIThumbnail;
      standard?: APIThumbnail;
      maxres?: APIThumbnail;
    };
    channelTitle: string;
    categoryId: string;
    liveBroadcastContent: string;
    localized: {
      title: string;
      description: string;
    };
    defaultAudioLanguage: string;
  };
  contentDetails: {
    duration?: string;
  };
}

interface IVideo {
  id: string;
  title: string;
  thumbnail: Thumbnail;
  duration: Duration | null;
  /** Duration in miliseconds */
  length: number | null;
  url: string;
  shortUrl: string;
  channel: {
    id: string;
    title: string;
  };
  raw: APIVideo;
}

export class Video implements IVideo {
  id: string;
  title: string;
  thumbnail: Thumbnail;
  duration: Duration | null;
  length: number | null;
  url: string;
  shortUrl: string;
  channel: {
    id: string;
    title: string;
  };

  raw: APIVideo;

  constructor(data: IVideo) {
    this.id = data.id;
    this.title = data.title;
    this.thumbnail = data.thumbnail;
    this.duration = data.duration;
    this.length = data.length;
    this.url = data.url;
    this.shortUrl = data.shortUrl;
    this.channel = data.channel;
    this.raw = data.raw;
  }

  static fromVideo(data: APIVideo) {
    const id = data.id;
    const title = data.snippet.title;
    const thumbnail = data.snippet.thumbnails.high ?? data.snippet.thumbnails.default;
    const duration = data.contentDetails.duration ? parse(data.contentDetails.duration) : null;
    const length = duration ? toSeconds(duration) * 1000 : null;

    return new Video({
      id,
      title,
      thumbnail,
      duration,
      length,
      url: `https://youtube.com/watch?v=${data.id}`,
      shortUrl: `https://youtu.be/${data.id}`,
      channel: {
        id: data.snippet.channelId,
        title: data.snippet.channelTitle,
      },
      raw: data,
    });
  }
}
