import { AudioPlayer, AudioResource, PlayerSubscription, VoiceConnection } from "@discordjs/voice";
import { Client, Guild, GuildMember, VoiceChannel } from "discord.js";
import { KamiMusicMetadata } from "./KamiMusicMetadata";

export declare enum RepeatMode {
    NoRepeat            = 0,
    RepeatQueue         = 1,
    RepeatCurrent       = 2,
    Random              = 3,
    RandomNoRepeat      = 4,
    TrueRandom          = 5,
    Backward            = 6,
    BackwardRepeatQueue = 7,
}

export declare class KamiMusicPlayer {
    constructor(channel: VoiceChannel, member: GuildMember);

    client: Client;
    channel: VoiceChannel;
    guild: Guild;
    owner: GuildMember;
    lock: boolean;
    connection: VoiceConnection;
    player: AudioPlayer;
    subscription: PlayerSubscription;
    queue: KamiMusicMetadata[];
    get currentIndex(): number;
    set currentIndex(value: number);
    get repeat(): RepeatMode;
    set repeat(value: RepeatMode);
    stopped: boolean;
    get volume(): number;
    set volume(value: number);
    get current(): KamiMusicMetadata;
    get nextIndex(): number;
    get paused(): boolean;

    _resource: AudioResource<KamiMusicMetadata>;
    _randomQueue: KamiMusicMetadata[];

    addResource(resource: KamiMusicMetadata, index?: number): void;
    removeIndex(index: number): ?KamiMusicMetadata;
    removeResource(resource: KamiMusicMetadata): ?number;
    play(index?: number): void;
    buffer(index: number, force?: boolean): void;
    next(): KamiMusicMetadata;
    prev(): KamiMusicMetadata;
    pause(): void;
    resume(): void;
    stop(force?: boolean): void;
    destroy(): void;
    reconnect(): void;
}