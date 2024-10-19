import type { KamiCommand } from '@/core/command';

import add from '&/add';
import clear from '&/clear';
import connect from '&/connect';
import current from '&/current';
import queue from '&/queue';

export default [
  add,
  clear,
  connect,
  current,
  queue,
] as KamiCommand[];
