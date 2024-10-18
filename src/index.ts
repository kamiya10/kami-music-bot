import "dotenv/config";

import { KamiClient } from "@/core/client";
import { setConsoleTitle } from "@/utils/console";

process.env.NODE_ENV ??= 'development';

const client = new KamiClient();

void client.login(
  process.env[process.env.NODE_ENV == 'production' ? 'KAMI_TOKEN' : 'DEV_TOKEN'],
);

setConsoleTitle(`Kami Music ${client.version}`);