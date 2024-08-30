interface IThumbnail {
  url    : string;
  width  : number;
  height : number;
}

export class Thumbnail implements IThumbnail {
  url    : string;
  width  : number;
  height : number;

  constructor(data: IThumbnail) {
    this.url = data.url;
    this.width = data.width;
    this.height = data.height;
  };
}