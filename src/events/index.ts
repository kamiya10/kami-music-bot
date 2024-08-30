import type { ClientEvents } from "discord.js";
import type { KamiClient } from "@/core/KamiClient";

import interactionCreate from "#/client/interactionCreate";
import ready from "#/client/ready";

export interface KamiEventListener<Event extends keyof ClientEvents> {
  name  : Event;
  on?   : (this: KamiClient, ...args: ClientEvents[Event]) => Promise<void>;
  once? : (this: KamiClient, ...args: ClientEvents[Event]) => Promise<void>;
}

export default [
  ready,
  interactionCreate,
] as KamiEventListener<keyof ClientEvents>[];