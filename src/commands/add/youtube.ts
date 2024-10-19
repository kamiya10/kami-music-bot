import { KamiSubcommandGroup } from '@/core/command';

import url from './youtube/url';

export default new KamiSubcommandGroup({
  name: 'youtube',
  description: 'Add videos from YouTube',
  subcommands: [url],
});
