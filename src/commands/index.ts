import type { KamiCommand } from '@/core/command';

import add from '&/add';
import connect from '&/connect';
import current from './current';
import queue from '&/queue';

export default [
  add,
  connect,
  current,
  queue,
] as KamiCommand[];
