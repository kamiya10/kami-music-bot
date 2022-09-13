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

interface Duration {
    second : number;
    minute : number;
    hour   : number;
    day    : number;
}

export declare class KamiMusicPlayer {
    constructor(channel: VoiceChannel, member: GuildMember);

    client: Client;
    channel: VoiceChannel;
    guild: Guild;
    owner: GuildMember;
    connection: VoiceConnection;
    player: AudioPlayer;
    subscription: PlayerSubscription;
    queue: KamiMusicMetadata[];
    get locked(): boolean;
    set locked(value: boolean);
    get currentIndex(): number;
    set currentIndex(value: number);
    get repeat(): RepeatMode;
    set repeat(value: RepeatMode);
    get playbackTime(): ?number;
    get playbackTimeObject(): ?Duration;
    get formattedPlaybackTime(): ?string;
    stopped: boolean;
    get volume(): number;
    set volume(value: number);
    get current(): KamiMusicMetadata;
    get nextIndex(): number;
    get paused(): boolean;

    _resource: AudioResource<KamiMusicMetadata>;
    _randomQueue: KamiMusicMetadata[];

    addResource(resource: KamiMusicMetadata, index?: number): Promise<number>;
    removeIndex(index: number): ?KamiMusicMetadata;
    removeResource(resource: KamiMusicMetadata): ?number;
    clear(): KamiMusicMetadata[];
    play(index?: number): Promise<void>;
    buffer(index: number, force?: boolean): Promise<void>;
    next(): KamiMusicMetadata;
    prev(): KamiMusicMetadata;
    pause(): void;
    resume(): void;
    stop(force?: boolean): void;
    destroy(): void;
    connect(channel: VoiceChannel): void;
    reconnect(): void;
    updateNowplayingMessage(): void;
}