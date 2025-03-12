import { KamiSubcommandGroup } from '@/core/command';

// import search from './soundcloud/search';
import url from './soundcloud/url';

export default new KamiSubcommandGroup({
  name: 'soundcloud',
  nameLocalizations: {},
  description: 'Add tracks from SoundCloud',
  descriptionLocalizations: {
    'zh-TW': '從 SoundCloud 新增音軌',
  },
  subcommands: [
    url,
    // search,
  ],
});
