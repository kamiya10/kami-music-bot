import add from '&/add';
import clear from '&/clear';
import connect from '&/connect';
import current from '&/current';
import jump from '&/jump';
import lock from '&/lock';
import next from '&/next';
import playlist from '&/playlist';
import prev from '&/prev';
import queue from '&/queue';
import remove from '&/remove';
import repeat from '&/repeat';

import type { KamiCommand } from '@/core/command';

export default [
  add,
  clear,
  connect,
  current,
  jump,
  lock,
  next,
  playlist,
  prev,
  queue,
  remove,
  repeat,
] as KamiCommand[];
