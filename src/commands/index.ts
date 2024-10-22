import type { KamiCommand } from '@/core/command';

import add from '&/add';
import clear from '&/clear';
import connect from '&/connect';
import current from '&/current';
import next from '&/next';
import queue from '&/queue';
import repeat from '&/repeat';

export default [
  add,
  clear,
  connect,
  current,
  next,
  queue,
  repeat,
] as KamiCommand[];
