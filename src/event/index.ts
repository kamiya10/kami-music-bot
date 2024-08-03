import type { ClientEvents } from "discord.js";
import type { KamiClient } from "../class/KamiClient";

import autocomplete from "./autocomplete";
import guildCreate from "./guildCreate";
import interaction from "./interaction";
import ready from "./ready";

export interface KamiEventListener<Event extends keyof ClientEvents> {
  name: Event;
  on?: (this: KamiClient, ...args: ClientEvents[Event]) => Promise<void>;
  once?: (this: KamiClient, ...args: ClientEvents[Event]) => Promise<void>;
}

export default [
  autocomplete,
  guildCreate,
  interaction,
  ready,
] as KamiEventListener<keyof ClientEvents>[];
