import type { KamiCommand } from "@/core/command";

import add from "&/add";
import connect from "&/connect";


export default [
  connect,
  add,
] as KamiCommand[];
