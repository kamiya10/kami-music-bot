import type { APIThumbnail, Thumbnail } from './thumbnail';

export interface APISearchResult {
  kind: 'youtube#searchResult';
  etag: string;
  id: {
    kind: 'youtube#video';
    videoId: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: APIThumbnail;
      medium: APIThumbnail;
      high: APIThumbnail;
    };
    channelTitle: string;
    liveBroadcastContent: 'none';
    publishTime: string;
  };
}

export class SearchResult {
  id: string;
  title: string;
  thumbnail: Thumbnail;
  channel: {
    id: string;
    title: string;
  };

  url: string;

  constructor(data: APISearchResult) {
    this.id = data.id.videoId;
    this.title = data.snippet.title;
    this.thumbnail = data.snippet.thumbnails.high ?? data.snippet.thumbnails.default;
    this.channel = {
      id: data.snippet.channelId,
      title: data.snippet.channelTitle,
    };
    this.url = `https://youtu.be/${data.id.videoId}`;
  };
}
