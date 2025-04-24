import 'dotenv/config';

import { generateDependencyReport } from '@discordjs/voice';

import { KamiClient } from '@/core/client';
import Logger from '@/utils/logger';
import { env } from '@/env';
import { setConsoleTitle } from '@/utils/console';

Logger.debug(generateDependencyReport());

const client = new KamiClient();

void client.login(
  env.NODE_ENV == 'production' ? env.KAMI_TOKEN : env.DEV_TOKEN,
);

setConsoleTitle(`Kami Music ${client.version}`);

process.on('beforeExit', () => {
  for (const player of client.players.values()) {
    player.destroy();
  }
});
