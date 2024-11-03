import onCommand from '#/client/onCommand';
import player from '#/client/player';
import ready from '#/client/ready';

import onAutocomplete from './client/onAutocomplete';

import type { EventHandler } from '@/core/event';

export default [
  onAutocomplete,
  onCommand,
  player,
  ready,
] as EventHandler[];
