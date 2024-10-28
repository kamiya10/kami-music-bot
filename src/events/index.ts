import type { EventHandler } from '@/core/event';

import onAutocomplete from './client/onAutocomplete';
import onCommand from '#/client/onCommand';
import player from '#/client/player';
import ready from '#/client/ready';

export default [
  onAutocomplete,
  onCommand,
  player,
  ready,
] as EventHandler[];
