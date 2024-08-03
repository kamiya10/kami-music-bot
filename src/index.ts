import "dotenv/config";

import { KamiClient, KamiIntents } from "./class/KamiClient";

const client = new KamiClient({
  intents : KamiIntents,
});

void client.login(process.env["KAMI_TOKEN"]);

process.stdout.write(
  `${String.fromCharCode(27)}]0;Kami Music ${client.version}${String.fromCharCode(7)}`
);
