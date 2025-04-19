import onAutocomplete from '#/client/onAutocomplete';
import onCommand from '#/client/onCommand';
import onContextMenu from '#/client/onContextMenu';
import player from '#/client/player';
import ready from '#/client/ready';

import type { EventHandler } from '@/core/event';

export default [
  onAutocomplete,
  onCommand,
  onContextMenu,
  player,
  ready,
] as EventHandler[];
