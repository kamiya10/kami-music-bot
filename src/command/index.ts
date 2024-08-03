import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import preference from "./other/preference";

import connect from "./player/connect";
import current from "./player/current";
import equalizer from "./player/equalizer";
import jump from "./player/jump";
import lock from "./player/lock";
import lyrics from "./player/lyrics";
import next from "./player/next";
import pause from "./player/pause";
import prev from "./player/prev";
import queue from "./player/queue";
import repeat from "./player/repeat";
import resume from "./player/resume";
import seek from "./player/seek";
import stop from "./player/stop";
import volume from "./player/volume";

import add from "./queue/add";
import clear from "./queue/clear";
import remove from "./queue/remove";
import type { KamiClient } from "@/core/client";

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;
  defer: boolean;
  ephemeral: boolean;
  execute(
    this: KamiClient,
    interaction: ChatInputCommandInteraction
  ): Promise<void>;
}

export default [
  preference,
  // player
  connect,
  current,
  equalizer,
  jump,
  lock,
  lyrics,
  next,
  pause,
  prev,
  queue,
  repeat,
  resume,
  seek,
  stop,
  volume,
  // queue
  add,
  clear,
  remove,
] as Command[];
