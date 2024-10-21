import type { EventHandler } from '@/core/event';

import onCommand from '#/client/onCommand';
import player from '#/client/player';
import ready from '#/client/ready';

export default [
  onCommand,
  player,
  ready,
] as EventHandler[];
