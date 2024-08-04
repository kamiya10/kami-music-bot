import { Playlist } from "./playlist";
import { Video } from "./video";

import type { APIPlaylist, APIPlaylistItem } from "./playlist";
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
  
  return Video.fromVideo(data.items[0]);
}
  
export const fetchVideos = async (id: string[]) => {
  const parms = new URLSearchParams({
    key        : process.env["YOUTUBE_TOKEN"] ?? "",
    part       : "contentDetails,snippet",
    id         : id.join(),
    maxResults : id.length.toString(),
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${parms.toString()}`);
  const data = await response.json() as APIResponse<APIVideo>;

  return data.items.map(v => Video.fromVideo(v));
}

export const fetchPlaylist = async (listId: string) => {
  const parms = new URLSearchParams({
    key  : process.env["YOUTUBE_TOKEN"] ?? "",
    part : "id,snippet",
    id   : listId,
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/playlists?${parms.toString()}`);

  const data = await response.json() as APIResponse<APIPlaylist>;
  const videos = await fetchPlaylistVideo(listId);

  return new Playlist(data.items[0], videos);
}

export const fetchPlaylistVideo = async (listId: string) => {
  const parms = new URLSearchParams({
    key        : process.env["YOUTUBE_TOKEN"] ?? "",
    part       : "id,snippet,contentDetails",
    playlistId : listId,
    maxResults : "50",
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${parms.toString()}`);
  const data = await response.json() as APIResponse<APIPlaylistItem>;

  const items = data.items;
  const groups = [];

  while (items.length) {
    groups.push(items.splice(0, 50));
  }

  const videos = [];

  for (const group of groups) {
    const ids = group.map(v=>v.snippet.resourceId.videoId);
    videos.push(...(await fetchVideos(ids)));
  }

  return videos;
}

export const parseUrl = (url: string) => {
  const u = new URL(url);
  
  if (u.hostname.endsWith("youtu.be")) {
    return {
      video    : u.pathname.slice(1),
      playlist : u.searchParams.get("list"),
    };
  }
  
  return {
    video    : u.searchParams.get("v"),
    playlist : u.searchParams.get("list"),
  };
}