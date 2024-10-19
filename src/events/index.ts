import type { EventHandler } from '@/core/event';

import interactionCreate from '#/client/onCommand';
import ready from '#/client/ready';

export default [
  ready,
  interactionCreate,
] as EventHandler[];
