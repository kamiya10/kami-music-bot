import { Video } from "./video";
import { inspect } from "bun";

import type { APIVideo } from "./video";

enum APIListKind {
  Video = "youtube#videoListResponse",
}

interface APIResponse<T> {
  kind          : APIListKind;
  etag          : string;
  nextPageToken : string;
  prevPageToken : string;
  pageInfo: {
    totalResults   : number;
    resultsPerPage : number;
  };
  items : T[];
}

export const fetchVideo = async(id: string)=> {
  const parms = new URLSearchParams({
    key  : process.env["YOUTUBE_TOKEN"] ?? "",
    part : "contentDetails,snippet",
    id,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${parms.toString()}`);
  const data = await response.json() as APIResponse<APIVideo>;
  console.log(inspect(data,{colors : true}));
  
  return new Video(data.items[0]);
}
  
export const fetchVideos = async (id: string[]) => {
  const parms = new URLSearchParams({
    key  : process.env["YOUTUBE_TOKEN"] ?? "",
    part : "contentDetails,snippet",
    id   : id.join(),
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${parms.toString()}`);
  const data = await response.json() as APIResponse<APIVideo>;

  return data.items.map(v=> new Video(v));
}