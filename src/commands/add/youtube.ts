import { KamiSubcommandGroup } from '@/core/command';

import url from './youtube/url';
import search from "./youtube/search";

export default new KamiSubcommandGroup({
  name: 'youtube',
  description: 'Add videos from YouTube',
  subcommands: [url,search],
});
