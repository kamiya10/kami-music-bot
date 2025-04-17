import 'dotenv/config';

import { generateDependencyReport } from '@discordjs/voice';

import { KamiClient } from '@/core/client';
import { env } from '@/env';
import { setConsoleTitle } from '@/utils/console';

if (env.NODE_ENV == 'development')
  console.log(generateDependencyReport());

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
