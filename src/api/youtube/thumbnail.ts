export interface APIThumbnail {
  url: string;
  width: number;
  height: number;
}

export class Thumbnail implements APIThumbnail {
  url: string;
  width: number;
  height: number;

  constructor(data: APIThumbnail) {
    this.url = data.url;
    this.width = data.width;
    this.height = data.height;
  };
}
