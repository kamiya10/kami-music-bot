import type { RepeatMode } from "@/class/KamiMusicPlayer";

export interface UserDataModel {
  volume            : number;
  locked            : boolean;
  equalizer         : string;
  repeat            : RepeatMode;
  updateVoiceStatus : boolean;
  playlist          : Record<string, number[]>
}

export type UserDatabase = Record<string, UserDataModel>;
