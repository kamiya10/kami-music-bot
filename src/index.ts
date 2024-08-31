import "dotenv/config";

import { KamiClient } from "@/core/KamiClient";
import { generateDependencyReport } from "@discordjs/voice";
import { setConsoleTitle } from "@/utils/console";

console.log(generateDependencyReport());

const client = new KamiClient();

void client.login(process.env["DEV_TOKEN"]);

setConsoleTitle(`Kami Music ${client.version}`);