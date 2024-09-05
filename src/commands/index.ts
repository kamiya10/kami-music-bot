import type { KamiCommand } from "./types";

// player
import connect from "@/commands/player/connect";

// queue
import add from "@/commands/queue/add";


export default [
  connect,
  add,
] as KamiCommand[];
