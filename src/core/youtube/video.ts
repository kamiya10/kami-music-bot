import { type Duration, parse, toSeconds } from "iso8601-duration";
import type { Thumbnail } from "./thumbnail";

export interface APIVideo {
  kind    : "youtube#video";
  etag    : string;
  id      : string;
  snippet : {
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
    },
    channelTitle         : string;
    categoryId           : string;
    liveBroadcastContent : string;
    localized: {
      title       : string;
      description : string;
    },
    defaultAudioLanguage : string;
  },
  contentDetails: {
    duration : string;
  }
}

export class Video {
  id        : string;
  title     : string;
  thumbnail : Thumbnail;
  duration  : Duration;
  /** Duration in miliseconds */
  length    : number;
  url       : string;
  shortUrl  : string;
  channel : {
    id    : string;
    title : string;
  };
  raw : APIVideo;
  
  constructor(data: APIVideo) {
    this.id = data.id;
    this.title = data.snippet.title;
    this.thumbnail = data.snippet.thumbnails.high ?? data.snippet.thumbnails.default;
    this.duration = parse(data.contentDetails.duration);
    this.length = toSeconds(this.duration) * 1000;
    this.url = `https://youtube.com/watch?v=${this.id}`;
    this.shortUrl = `https://youtu.be/${this.id}`;
    this.channel = {
      id    : data.snippet.channelId,
      title : data.snippet.channelTitle,
    }
    this.raw = data;
  }
}