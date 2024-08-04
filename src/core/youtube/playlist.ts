import type { Thumbnail } from "@/core/youtube/thumbnail";
import type { Video } from "./video";

export interface APIPlaylist {
  kind    : "youtube#playlist";
  etag    : string;
  id      : string;
  snippet: {
    publishedAt : string;
    channelId   : string;
    title       : string;
    description : string;
    thumbnails  : {
      default     : Thumbnail;
      medium      : Thumbnail;
      high        : Thumbnail;
      standard  ? : Thumbnail;
      maxres    ? : Thumbnail;
    };
    channelTitle    : string;
    defaultLanguage : string;
    localized: {
      title       : string;
      description : string;
    }
  };
}

export interface APIPlaylistItem {
  kind    : "youtube#playlistItem";
  etag    : string;
  id      : string;
  snippet: {
    publishedAt : string;
    channelId   : string;
    title       : string;
    description : string;
    thumbnails  : {
      default     : Thumbnail;
      medium      : Thumbnail;
      high        : Thumbnail;
      standard  ? : Thumbnail;
      maxres    ? : Thumbnail;
    };
    channelTitle           : string,
    videoOwnerChannelTitle : string;
    videoOwnerChannelId    : string;
    playlistId             : string;
    position               : number;
    resourceId: {
      kind    : string;
      videoId : string;
    };
  };
  contentDetails: {
    videoId          : string;
    startAt          : string;
    endAt            : string;
    note             : string;
    videoPublishedAt : string;
  };
}

export class Playlist {
  id        : string;
  title     : string;
  thumbnail : Thumbnail;
  channel : {
    id    : string;
    title : string;
  };
  videos : Video[];
  url    : string;

  constructor(data: APIPlaylist, videos: Video[]) {
    this.id = data.id;
    this.title = data.snippet.title;
    this.thumbnail = data.snippet.thumbnails.high ?? data.snippet.thumbnails.default;
    this.channel = {
      id    : data.snippet.channelId,
      title : data.snippet.channelTitle,
    }
    this.videos = videos;
    this.url = `https://www.youtube.com/playlist?list=${this.id}`;
  }
}