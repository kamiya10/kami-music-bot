import { KamiSubcommandGroup } from '@/core/command';

import search from './youtube/search';
import url from './youtube/url';

export default new KamiSubcommandGroup({
  name: 'youtube',
  description: 'Add videos from YouTube',
  subcommands: [url, search],
});
