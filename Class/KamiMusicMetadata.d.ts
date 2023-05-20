import { AudioPlayerError } from "@discordjs/voice";
import { GuildMember } from "discord.js";
import { Playlist } from "simple-youtube-api";

export declare enum Platform {
    Youtube      = "youtube",
    YoutubeMusic = "youtubemusic",
    Soundcloud   = "soundcloud"
}

interface Duration {
    second : number;
    minute : number;
    hour   : number;
    day    : number;
}

interface LyricMetadata {
    name          : string;
    url           : string;
    titlePredict  : string;
    artistPredict : string;
    id            : string;
}

interface KamiMusicMetadataJSON {
    id: string;
    title: string;
    artist: string;
    duration: number;
    thumbnail: string;
    url: string;
    shortURL: string;
    platform: Platform;
    region: string[];
    full: boolean;
    lyric?: string;
    lyricMetadata?: LyricMetadata;
    raw: object;
}

export declare class KamiMusicMetadata {
    constructor(data: any, member: GuildMember);

    id: string;
    title: string;
    artist: string;
    duration: number;
    thumbnail: string;
    url: string;
    shortURL: string;
    origin: Playlist;
    platform: Platform;
    member: GuildMember;
    error?: AudioPlayerError;
    region: string[];
    full: boolean;
    lyric?: string;
    lyricMetadata?: LyricMetadata;
    raw: object;

    get playable(): boolean;
    get durationObject(): Duration;
    get formattedDuration(): string;
    toJSON(): KamiMusicMetadataJSON;
}