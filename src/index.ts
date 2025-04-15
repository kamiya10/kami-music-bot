import 'dotenv/config';

import { generateDependencyReport } from '@discordjs/voice';

import { KamiClient } from '@/core/client';
import { setConsoleTitle } from '@/utils/console';

process.env['NODE_ENV'] ??= 'development';

if (process.env['NODE_ENV'] == 'development')
  console.log(generateDependencyReport());

const client = new KamiClient();

void client.login(
  process.env[process.env['NODE_ENV'] == 'production' ? 'KAMI_TOKEN' : 'DEV_TOKEN'],
);

setConsoleTitle(`Kami Music ${client.version}`);

process.on('beforeExit', () => {
  for (const player of client.players.values()) {
    player.destroy();
  }
});
