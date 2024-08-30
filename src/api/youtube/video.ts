import { parse, toSeconds } from "iso8601-duration";

import type {  Duration } from "iso8601-duration";
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

interface IVideo {
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
}

export class Video implements IVideo {
  id        : string;
  title     : string;
  thumbnail : Thumbnail;
  duration  : Duration;
  length    : number;
  url       : string;
  shortUrl  : string;
  channel : {
    id    : string;
    title : string;
  };
  raw : APIVideo;
  
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
    const duration = parse(data.contentDetails.duration);
    const length = toSeconds(duration) * 1000;

    return new Video({
      id,
      title,
      thumbnail,
      duration,
      length,
      url      : `https://youtube.com/watch?v=${data.id}`,
      shortUrl : `https://youtu.be/${data.id}`,
      channel  : {
        id    : data.snippet.channelId,
        title : data.snippet.channelTitle,
      },
      raw : data,
    });
  }
}