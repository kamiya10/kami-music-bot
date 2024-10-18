import type { KamiCommand } from "@/core/command";

import add from "&/add";
import connect from "&/connect";
import queue from "&/queue";

export default [
  add,
  connect,
  queue,
] as KamiCommand[];
