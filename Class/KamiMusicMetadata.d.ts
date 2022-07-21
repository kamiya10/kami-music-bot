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

    get playable(): boolean;
    get durationObject(): Duration;
    get formattedDuration(): string;
}