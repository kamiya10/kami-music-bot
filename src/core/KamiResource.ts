import type { Video } from "@/api/youtube/video";

interface KamiResourceOptions {
  title: string;
  length: number;
  path: string;
}

export class KamiResource {
  title: string;
  length: number;
  path: string;
  
  constructor(options: KamiResourceOptions) {
    this.title = options.title;
    this.length = options.length;
    this.path = options.path;
  }

  static youtube(video: Video, path: string): KamiResource {
    return new KamiResource({
      title: video.title,
      length: video.length,
      path: path,
    });
  }
}

export enum Platform {
  YouTube = "youtube",
}