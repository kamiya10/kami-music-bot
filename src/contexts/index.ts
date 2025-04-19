import addToPlaylist from './add_to_playlist';
import addToQueue from './add_to_queue';

import type { KamiContext } from '@/core/context';

const contextMenus: KamiContext[] = [
  addToPlaylist,
  addToQueue,
];

export default contextMenus;
