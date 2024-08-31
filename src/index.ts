import "dotenv/config";

import { KamiClient } from "@/core/KamiClient";
import { setConsoleTitle } from "@/utils/console";

const client = new KamiClient();

void client.login(process.env["DEV_TOKEN"]);

setConsoleTitle(`Kami Music ${client.version}`);